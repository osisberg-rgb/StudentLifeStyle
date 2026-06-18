# Skriver Supabase-access-tokenet (fra Windows Credential Manager) til stdout.
# Bruges til at sætte $env:SUPABASE_ACCESS_TOKEN før supabase CLI-kald.
$ErrorActionPreference = 'Stop'
$sig = @"
using System; using System.Runtime.InteropServices;
public class CredMgrTok {
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
if (-not [CredMgrTok]::CredRead("Supabase CLI:supabase", 1, 0, [ref]$ptr)) { throw "Kunne ikke laese Supabase-token (koer 'supabase login')" }
$cred = [System.Runtime.InteropServices.Marshal]::PtrToStructure($ptr, [type]([CredMgrTok+CREDENTIAL]))
$bytes = New-Object byte[] $cred.CredentialBlobSize
[System.Runtime.InteropServices.Marshal]::Copy($cred.CredentialBlob, $bytes, 0, $cred.CredentialBlobSize)
[CredMgrTok]::CredFree($ptr)
$token = ([System.Text.Encoding]::Unicode.GetString($bytes)).Trim([char]0)
if ($token -notmatch '^sbp_') { $token = ([System.Text.Encoding]::UTF8.GetString($bytes)).Trim([char]0) }
Write-Output $token
