$ErrorActionPreference = 'Stop'
$modelDir = Join-Path $PSScriptRoot 'models'
New-Item -ItemType Directory -Force -Path $modelDir | Out-Null
python -m pip install -r (Join-Path $PSScriptRoot 'requirements.txt')
curl.exe --fail --location --output (Join-Path $modelDir 'kokoro-v1.0.int8.onnx') 'https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.1/kokoro-v1.0.int8.onnx'
curl.exe --fail --location --output (Join-Path $modelDir 'voices-v1.0.bin') 'https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.1/voices-v1.0.bin'
