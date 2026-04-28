param(
  [string]$BaseUrl = "http://localhost:3000"
)

$ErrorActionPreference = "Stop"

function Assert-True([bool]$Condition, [string]$Message) {
  if (-not $Condition) {
    throw "Smoke check failed: $Message"
  }
}

Write-Host "Running smoke checks against $BaseUrl/api/express-demo/chat"

# 1) Missing required fields should return 400
$missingPayload = @{ message = "hello" } | ConvertTo-Json
$missingResponse = Invoke-WebRequest -Uri "$BaseUrl/api/express-demo/chat" -Method POST -ContentType "application/json" -Body $missingPayload -SkipHttpErrorCheck
Assert-True ($missingResponse.StatusCode -eq 400) "Expected 400 for missing required fields"
Write-Host "OK: missing required fields returns 400"

# 2) Valid payload should return JSON with reply/actions shape
$validPayloadObject = @{
  customer_id = "00000000-0000-0000-0000-000000000001"
  station_id = "11111111-1111-1111-1111-111111111111"
  trigger_type = "manual"
  available_triggers = @("manual")
  distance_km = 1.2
  message = "Can you get coffee ready for me?"
  conversation_history = @(@{ role = "customer"; text = "Hi" })
}
$validPayload = $validPayloadObject | ConvertTo-Json -Depth 6
$validResponse = Invoke-WebRequest -Uri "$BaseUrl/api/express-demo/chat" -Method POST -ContentType "application/json" -Body $validPayload -SkipHttpErrorCheck

Assert-True (($validResponse.StatusCode -eq 200) -or ($validResponse.StatusCode -eq 404)) "Expected 200 or 404 for valid payload"
$validBody = $validResponse.Content | ConvertFrom-Json

if ($validResponse.StatusCode -eq 200) {
  Assert-True ($null -ne $validBody.reply) "Expected reply field for successful response"
  Assert-True ($null -ne $validBody.actions) "Expected actions field for successful response"
  Write-Host "OK: valid payload returns reply/actions contract"
} else {
  Write-Host "INFO: valid payload returned 404 (seed IDs not present in this environment)"
}

# 3) If OPENAI key is missing in app env, route should return configuration message with actions array.
# This check is conditional because the running app environment may already have OPENAI_API_KEY set.
if ($validResponse.StatusCode -eq 200 -and $validBody.reply -eq "Voice concierge is not configured. Please set OPENAI_API_KEY.") {
  Assert-True ($validBody.actions.Count -eq 0) "Expected empty actions when provider key is unavailable"
  Write-Host "OK: provider-unavailable fallback response contract"
}

Write-Host "Smoke checks completed."
