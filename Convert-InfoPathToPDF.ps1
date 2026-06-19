<#
.SYNOPSIS
    PDF Generator for InfoPath XML forms using the extracted form template.

.DESCRIPTION
    Uses an InfoPath template source file or extracted template folder to transform each
    XML form into HTML with the original InfoPath view, then prints the HTML to PDF
    using Microsoft Edge. When a raw .xsn is supplied, the script unpacks it with the
    built-in Windows expand utility.

.PARAMETER SourceFolder
    Folder containing InfoPath XML files. Can be a local path or UNC path.

.PARAMETER OutputFolder
    Folder for generated PDFs. Defaults to a PDFs subfolder inside SourceFolder.

.PARAMETER TemplateFolder
    Folder containing the extracted XSN files. Defaults to the SourceForms\SEA2015-Library_XSN_Components
    folder next to this script.

.PARAMETER Recursive
    Scan subfolders for XML files.

.PARAMETER EdgePath
    Optional path to msedge.exe.

.EXAMPLE
    .\Convert-InfoPathToPDF.ps1 -SourceFolder "C:\Shared\InfoPathForms"

.EXAMPLE
    .\Convert-InfoPathToPDF.ps1 -SourceFolder "\\server\share\forms" -Recursive
#>
param(
    [Parameter(Mandatory = $true)]
    [string]$SourceFolder,

    [Parameter(Mandatory = $false)]
    [string]$OutputFolder = "",

    [Parameter(Mandatory = $false)]
    [string]$TemplateFolder = "",

    [Parameter(Mandatory = $false)]
    [switch]$Recursive,

    [Parameter(Mandatory = $false)]
    [string]$EdgePath = ""
)

Set-StrictMode -Off
$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Web
Add-Type -AssemblyName System.IO.Compression.FileSystem

function Resolve-ExistingPath {
    param([string]$Path)
    if ([string]::IsNullOrWhiteSpace($Path)) {
        return $null
    }
    try {
        return (Resolve-Path -LiteralPath $Path).Path
    } catch {
        return $null
    }
}

function Find-EdgeExe {
    if ($script:EdgePath -and (Test-Path $script:EdgePath)) {
        return $script:EdgePath
    }

    $candidates = @(
        "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
        "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
        "$env:LOCALAPPDATA\Microsoft\Edge\Application\msedge.exe"
    )

    foreach ($candidate in $candidates) {
        if (Test-Path $candidate) {
            return $candidate
        }
    }

    $command = Get-Command "msedge.exe" -ErrorAction SilentlyContinue
    if ($command) {
        return $command.Source
    }

    throw "Microsoft Edge (msedge.exe) was not found."
}

function Get-RelativePath {
    param(
        [string]$BasePath,
        [string]$TargetPath
    )

    $baseFull = [System.IO.Path]::GetFullPath($BasePath).TrimEnd('\') + '\'
    $targetFull = [System.IO.Path]::GetFullPath($TargetPath)

    if ($targetFull.StartsWith($baseFull, [System.StringComparison]::OrdinalIgnoreCase)) {
        return $targetFull.Substring($baseFull.Length)
    }

    return [System.IO.Path]::GetFileName($targetFull)
}

function Get-TemplateFolder {
    param([string]$RequestedTemplateFolder)

    $resolved = Resolve-ExistingPath $RequestedTemplateFolder
    if ($resolved) {
        return $resolved
    }

    $scriptDefault = Join-Path $PSScriptRoot "SourceForms\SEA2015-Library_XSN_Components"
    $resolved = Resolve-ExistingPath $scriptDefault
    if ($resolved) {
        return $resolved
    }

    $scriptDefaultXsn = Join-Path $PSScriptRoot "SourceForms\SEA2015-Library.xsn"
    $resolved = Resolve-ExistingPath $scriptDefaultXsn
    if ($resolved) {
        return $resolved
    }

    throw "Template source not found. Pass -TemplateFolder with either the extracted XSN folder or the raw .xsn file."
}

function New-RenderWorkspace {
    param([string]$TemplateSourcePath)

    $workspace = Join-Path ([System.IO.Path]::GetTempPath()) ("InfoPathRender_" + [System.Guid]::NewGuid().ToString("N"))
    New-Item -ItemType Directory -Path $workspace -Force | Out-Null

    if (Test-Path $TemplateSourcePath -PathType Leaf) {
        $extension = [System.IO.Path]::GetExtension($TemplateSourcePath)
        if ($extension -ieq ".xsn") {
            & expand.exe $TemplateSourcePath -F:* $workspace | Out-Null
            if ($LASTEXITCODE -ne 0) {
                throw "Failed to extract XSN using expand.exe."
            }
            return $workspace
        }
        if ($extension -ieq ".zip") {
            [System.IO.Compression.ZipFile]::ExtractToDirectory($TemplateSourcePath, $workspace)
            return $workspace
        }
    }

    Copy-Item -Path (Join-Path $TemplateSourcePath "*") -Destination $workspace -Recurse -Force
    return $workspace
}

function Write-RenderedHtml {
    param(
        [string]$XmlPath,
        [string]$WorkspaceFolder,
        [string]$HtmlPath
    )

    $transform = New-Object System.Xml.Xsl.XslCompiledTransform
    $xslPath = Join-Path $WorkspaceFolder "view1.xsl"
    $transform.Load($xslPath)

    $settings = New-Object System.Xml.XmlWriterSettings
    $settings.Encoding = [System.Text.Encoding]::UTF8
    $settings.Indent = $false
    $settings.OmitXmlDeclaration = $false

    $writer = [System.Xml.XmlWriter]::Create($HtmlPath, $settings)
    try {
        $transform.Transform($XmlPath, $null, $writer)
    } finally {
        $writer.Close()
    }
}

function Convert-ToPdf {
    param(
        [string]$HtmlPath,
        [string]$PdfPath,
        [string]$EdgeExe
    )

    $fileUri = [System.Uri]::new($HtmlPath).AbsoluteUri
    $arguments = @(
        "--headless=new",
        "--disable-gpu",
        "--allow-file-access-from-files",
        "--run-all-compositor-stages-before-draw",
        "--print-to-pdf=`"$PdfPath`"",
        "--print-to-pdf-no-header",
        $fileUri
    )

    $process = Start-Process -FilePath $EdgeExe -ArgumentList $arguments -Wait -PassThru -WindowStyle Hidden
    return $process.ExitCode
}

$script:EdgePath = $EdgePath
$SourceFolder = (Resolve-ExistingPath $SourceFolder)
if (-not $SourceFolder) {
    Write-Error "Source folder not found."
    exit 1
}

if (-not $OutputFolder) {
    $OutputFolder = Join-Path $SourceFolder "PDFs"
}
if (-not (Test-Path $OutputFolder)) {
    New-Item -ItemType Directory -Path $OutputFolder -Force | Out-Null
}

$TemplateFolder = Get-TemplateFolder -RequestedTemplateFolder $TemplateFolder
$EdgeExe = Find-EdgeExe

Write-Host "Using template source: $TemplateFolder"
Write-Host "Using Edge: $EdgeExe"

$renderWorkspace = New-RenderWorkspace -TemplateSourcePath $TemplateFolder

try {
    $xmlFiles = Get-ChildItem -LiteralPath $SourceFolder -Filter "*.xml" -File -Recurse:$Recursive
    if (-not $xmlFiles -or $xmlFiles.Count -eq 0) {
        Write-Warning "No XML files found in: $SourceFolder"
        exit 0
    }

    Write-Host "Found $($xmlFiles.Count) XML file(s). Processing..."
    Write-Host ""

    $success = 0
    $failed = 0

    foreach ($file in $xmlFiles) {
        $index = $success + $failed + 1
        Write-Host "  [$index/$($xmlFiles.Count)] $($file.Name) ..." -NoNewline

        $relativeDir = Get-RelativePath -BasePath $SourceFolder -TargetPath $file.DirectoryName
        $outputDir = $OutputFolder
        if ($Recursive -and $relativeDir -and $relativeDir -ne ".") {
            $outputDir = Join-Path $OutputFolder $relativeDir
        }
        if (-not (Test-Path $outputDir)) {
            New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
        }

        $pdfPath = Join-Path $outputDir ([System.IO.Path]::GetFileNameWithoutExtension($file.Name) + ".pdf")
        $htmlPath = Join-Path $renderWorkspace ([System.Guid]::NewGuid().ToString("N") + ".html")

        try {
            Write-RenderedHtml -XmlPath $file.FullName -WorkspaceFolder $renderWorkspace -HtmlPath $htmlPath
            $exitCode = Convert-ToPdf -HtmlPath $htmlPath -PdfPath $pdfPath -EdgeExe $EdgeExe

            if (($exitCode -eq 0) -and (Test-Path $pdfPath)) {
                $sizeKB = [math]::Round((Get-Item $pdfPath).Length / 1KB, 1)
                Write-Host " OK ($sizeKB KB)"
                $success++
            } else {
                Write-Host " FAILED (Edge exit code $exitCode)"
                $failed++
            }
        } catch {
            Write-Host " ERROR: $($_.Exception.Message)"
            $failed++
        } finally {
            Remove-Item $htmlPath -Force -ErrorAction SilentlyContinue
        }
    }

    Write-Host ""
    Write-Host "Done. $success succeeded, $failed failed."
    Write-Host "PDFs saved to: $OutputFolder"

    if ($failed -gt 0) { exit 1 } else { exit 0 }
} finally {
    if (Test-Path $renderWorkspace) {
        Remove-Item $renderWorkspace -Recurse -Force -ErrorAction SilentlyContinue
    }
}
