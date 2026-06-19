# InfoPath PDF Generator

This repository contains a standalone Windows tool that converts InfoPath XML form files into human-readable PDF documents.

## What it does

- Scans a folder of InfoPath `.xml` files
- Uses the included InfoPath template `.xsn` file to render the form layout
- Prints each rendered form to PDF with Microsoft Edge
- Runs locally on Windows without installing a new application

## Files

- `Convert-InfoPathToPDF.ps1` - main PowerShell converter
- `Convert InfoPath to PDF.bat` - batch launcher for the converter
- `Start PDF Generator.bat` - root launcher for double-click use
- `PDFs/` - output folder for generated PDFs

## Requirements

- Windows PowerShell 5.1 or later
- Microsoft Edge
- Read access to the folder containing the InfoPath XML files

## Usage

1. Double-click `Start PDF Generator.bat`.
2. Enter the folder path that contains the InfoPath XML files.
3. Choose an output folder or press Enter to use the default `PDFs` folder.
4. The tool renders each XML form and saves a PDF for each file.

## Notes

- The converter can read `.xsn` files directly.
- The `PDFs/` folder is ignored by Git so generated output stays local.
