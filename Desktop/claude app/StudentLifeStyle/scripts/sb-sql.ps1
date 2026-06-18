# Kør SQL mod Supabase via Management API. Token læses sikkert fra Windows
# Credential Manager (target "Supabase CLI:supabase"). Ingen interaktiv login.
#
#   pwsh scripts/sb-sql.ps1 -File supabase/migrations/foo.sql
#   pwsh scripts/sb-sql.ps1 -Query "select 1"
param([string]$File, [string]$Query)
$ErrorActionPreference = 'Stop'

$sig = @"
using System; using System.Runtime.InteropServices;
public class CredMgrSql {
  [DllImport("advapi32.dll", CharSet=CharSet.Unicode, SetLastError=true)]
  public static extern bool CredRead(string target, int type, int flags, out IntPtr credential);
  [DllImport("advapi32.dll")] public static extern void CredFree(IntPtr cred);
  [StructLayout(LayoutKind.Sequential)]
  public struct CREDENTIAL { public int Flags; public int Type; public IntPtr TargetName; public IntPtr Comment;
    public long LastWritten; public int CredentialBlobSize; public IntPtr CredentialBlob;
    public int Persist; public int AttributeCount; public IntPtr Attributes; public IntPtr TargetAlias; public IntPtr UserName; }
}
"@
Add-Type -TypeDefinition $sig
$ptr = [IntPtr]::Zero
if (-not [CredMgrSql]::CredRead("Supabase CLI:supabase", 1, 0, [ref]$ptr)) { throw "Kunne ikke laese Supabase-token (koer 'supabase login')" }
$cred = [System.Runtime.InteropServices.Marshal]::PtrToStructure($ptr, [type]([CredMgrSql+CREDENTIAL]))
$bytes = New-Object byte[] $cred.CredentialBlobSize
[System.Runtime.InteropServices.Marshal]::Copy($cred.CredentialBlob, $bytes, 0, $cred.CredentialBlobSize)
[CredMgrSql]::CredFree($ptr)
$token = ([System.Text.Encoding]::Unicode.GetString($bytes)).Trim([char]0)
if ($token -notmatch '^sbp_') { $token = ([System.Text.Encoding]::UTF8.GetString($bytes)).Trim([char]0) }

if ($File)      { $sql = Get-Content -Raw $File }
elseif ($Query) { $sql = $Query }
else            { throw "Angiv -File eller -Query" }

# Brug JavaScriptSerializer i stedet for ConvertTo-Json: PS 5.1's ConvertTo-Json
# mis-serialiserer lange/flerlinjede strenge som {"value":...,"Count":...}.
Add-Type -AssemblyName System.Web.Extensions
$ser = New-Object System.Web.Script.Serialization.JavaScriptSerializer
$body = $ser.Serialize(@{ query = [string]$sql })
# Send som UTF-8 bytes — ellers koder PS 5.1 body'en som Latin-1 og ødelægger
# tegn uden for Latin-1 (fx em-dash —), så API'ets JSON-parser fejler.
$bytes = [System.Text.Encoding]::UTF8.GetBytes($body)
$r = Invoke-RestMethod -Method Post -Uri "https://api.supabase.com/v1/projects/oqolcifpmdybimspnadc/database/query" -Headers @{ Authorization = "Bearer $token" } -ContentType "application/json; charset=utf-8" -Body $bytes
$r | ConvertTo-Json -Depth 10
