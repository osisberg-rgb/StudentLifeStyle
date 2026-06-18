# Ugentlig tilbuds-opdatering — launcher.
# Henter Supabase-nøglerne sikkert (fra Windows Credential Manager → Management
# API) og kører scripts/opdater-tilbud.mjs, som uploader PDF+cover og udtrækker
# tilbud til `tilbud`-tabellen.
#
#   pwsh scripts/opdater-tilbud.ps1                 # indeværende uge
#   pwsh scripts/opdater-tilbud.ps1 -Uge 25         # bestemt uge
#   pwsh scripts/opdater-tilbud.ps1 -Uge 25 -MaxSider 5   # hurtig test (få sider)
param([int]$Uge = 0, [int]$MaxSider = 0)
$ErrorActionPreference = 'Stop'

$sig = @"
using System; using System.Runtime.InteropServices;
public class CredMgrTilbud {
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
if (-not [CredMgrTilbud]::CredRead("Supabase CLI:supabase", 1, 0, [ref]$ptr)) { throw "Kunne ikke læse Supabase-token (kør 'supabase login' først)" }
$cred = [System.Runtime.InteropServices.Marshal]::PtrToStructure($ptr, [type]([CredMgrTilbud+CREDENTIAL]))
$bytes = New-Object byte[] $cred.CredentialBlobSize
[System.Runtime.InteropServices.Marshal]::Copy($cred.CredentialBlob, $bytes, 0, $cred.CredentialBlobSize)
[CredMgrTilbud]::CredFree($ptr)
$token = ([System.Text.Encoding]::Unicode.GetString($bytes)).Trim([char]0)
if ($token -notmatch '^sbp_') { $token = ([System.Text.Encoding]::UTF8.GetString($bytes)).Trim([char]0) }

$ref = 'oqolcifpmdybimspnadc'
$keys = Invoke-RestMethod -Method Get -Uri "https://api.supabase.com/v1/projects/$ref/api-keys" -Headers @{ Authorization = "Bearer $token" }
$env:SB_SERVICE = ($keys | Where-Object { $_.name -eq 'service_role' }).api_key
$env:SB_ANON    = ($keys | Where-Object { $_.name -eq 'anon' }).api_key
if (-not $env:SB_SERVICE -or -not $env:SB_ANON) { throw "Kunne ikke hente service/anon-nøgler" }

$projekt = Split-Path -Parent $PSScriptRoot
Set-Location $projekt
$argv = @('scripts/opdater-tilbud.mjs')
if ($Uge -gt 0)      { $argv += "--uge=$Uge" }
if ($MaxSider -gt 0) { $argv += "--maxsider=$MaxSider" }
node @argv
