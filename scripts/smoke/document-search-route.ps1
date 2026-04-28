param(
  [string]$BaseUrl = "http://localhost:3000"
)

$ErrorActionPreference = "Stop"

function Assert-True([bool]$Condition, [string]$Message) {
  if (-not $Condition) {
    throw "Smoke check failed: $Message"
  }
}

function Invoke-JsonPost([string]$Url, [string]$JsonBody) {
  try {
    $res = Invoke-WebRequest -Uri $Url -Method POST -ContentType "application/json" -Body $JsonBody
    return @{
      StatusCode = [int]$res.StatusCode
      Content = $res.Content
    }
  } catch {
    $response = $_.Exception.Response
    if ($null -eq $response) { throw }
    $reader = New-Object System.IO.StreamReader($response.GetResponseStream())
    $content = $reader.ReadToEnd()
    return @{
      StatusCode = [int]$response.StatusCode
      Content = $content
    }
  }
}

Write-Host "Running smoke checks against $BaseUrl/api/search"

# 1) Missing query should return 400 with validation code
$missingPayload = @{ top_k = 3 } | ConvertTo-Json
$missingResponse = Invoke-JsonPost -Url "$BaseUrl/api/search" -JsonBody $missingPayload
Assert-True ($missingResponse.StatusCode -eq 400) "Expected 400 for missing query"
$missingBody = $missingResponse.Content | ConvertFrom-Json
Assert-True ($missingBody.code -eq "validation_failed") "Expected validation_failed error code"
Write-Host "OK: missing query validation response"

# 2) Valid request should return successful contract or provider-unavailable fallback
$validPayload = @{
  query = "Summarize key 2024 ADNOC highlights"
  top_k = 3
} | ConvertTo-Json
$validResponse = Invoke-JsonPost -Url "$BaseUrl/api/search" -JsonBody $validPayload
$validBody = $validResponse.Content | ConvertFrom-Json

if ($validResponse.StatusCode -eq 200) {
  Assert-True ($null -ne $validBody.matches) "Expected matches in success response"
  Write-Host "OK: valid query success response"
} else {
  Assert-True (($validResponse.StatusCode -eq 503) -or ($validResponse.StatusCode -eq 500) -or ($validResponse.StatusCode -eq 502)) "Expected server fallback status"
  Assert-True ($null -ne $validBody.code) "Expected structured error code in server fallback"
  Write-Host "OK: provider/retrieval fallback response is structured"
}

Write-Host "Smoke checks completed."
