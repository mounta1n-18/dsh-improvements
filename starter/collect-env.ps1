# 只读环境采集：不修改任何文件。
# 用法：pwsh -File collect-env.ps1
# 输出直接给 agent 读；缺项写 (not found) 即可。

$ErrorActionPreference = 'SilentlyContinue'

function Line($key, $value) {
  '{0,-16} {1}' -f ($key + ':'), $value
}

$homeDir = $env:USERPROFILE
$dshHome = Join-Path $homeDir '.dsh'
$dshCmd = Get-Command dsh -ErrorAction SilentlyContinue
if ($dshCmd) {
  $dshExe = $dshCmd.Source
} else {
  $candidate = Join-Path $env:LOCALAPPDATA 'Programs\DeepSeek Harness\resources\bin\dsh.cmd'
  $dshExe = if (Test-Path $candidate) { $candidate } else { '(not found)' }
}

Line 'Computer' $env:COMPUTERNAME
Line 'User' $env:USERNAME
Line 'Home' $homeDir
Line 'OS' ([System.Environment]::OSVersion.VersionString)
Line 'PowerShell' ($PSVersionTable.PSVersion.ToString())
Line 'pwsh' (Get-Command pwsh -ErrorAction SilentlyContinue | ForEach-Object { $_.Source })
Line 'dsh' $dshExe
if ($dshExe -ne '(not found)') {
  Line 'dsh version' (& $dshExe --version 2>&1 | Select-Object -First 1)
}

Line '.dsh exists' (Test-Path $dshHome)
if (Test-Path $dshHome) {
  $profiles = Get-ChildItem (Join-Path $dshHome 'profiles') -Directory -ErrorAction SilentlyContinue
  Line 'profiles' (($profiles | ForEach-Object { $_.Name }) -join ', ')
  Line '.dsh entries' ((Get-ChildItem $dshHome -Force | ForEach-Object { $_.Name }) -join ', ')
  Line '.dsh size MB' ([math]::Round(((Get-ChildItem $dshHome -Recurse -File -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum / 1MB), 1))
}

$py = Get-Command python -ErrorAction SilentlyContinue
$pyLauncher = Get-Command py -ErrorAction SilentlyContinue
Line 'python' ($py.Source)
Line 'py launcher' ($pyLauncher.Source)
if ($py) {
  Line 'python version' (& python --version 2>&1 | Select-Object -First 1)
  Line 'Pillow' (& python -c "import PIL; print(PIL.__version__)" 2>&1 | Select-Object -First 1)
}
Line 'node' (Get-Command node -ErrorAction SilentlyContinue | ForEach-Object { $_.Source })

$chrome = @(
  (Join-Path $env:ProgramFiles 'Google\Chrome\Application\chrome.exe'),
  (Join-Path ${env:ProgramFiles(x86)} 'Google\Chrome\Application\chrome.exe'),
  (Join-Path $env:LOCALAPPDATA 'Google\Chrome\Application\chrome.exe')
) | Where-Object { Test-Path $_ } | Select-Object -First 1
Line 'chrome' $chrome
Line 'git' (Get-Command git -ErrorAction SilentlyContinue | ForEach-Object { $_.Source })
Line 'gh' (Get-Command gh -ErrorAction SilentlyContinue | ForEach-Object { $_.Source })

$disk = Get-PSDrive -Name C -ErrorAction SilentlyContinue
if ($disk) {
  Line 'C: free GB' ([math]::Round($disk.Free / 1GB, 1))
}

Line 'Documents' (Join-Path $homeDir 'Documents')
Line 'Desktop' (Join-Path $homeDir 'Desktop')
