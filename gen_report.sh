#!/usr/bin/env bash

report_base_dir=`echo $0 | sed -r 's/\/gen_report.sh//'`
if [ $report_base_dir == "." ]; then report_base_dir=`pwd`; fi

CONFIG_FILE=input/config.json

# Override CONFIG_FILE if $1 is provided
if [ -n "$1" ]; then
  CONFIG_FILE="$1"
fi

# Validate CONFIG_FILE
if [ -f "$CONFIG_FILE" ]; then
  echo "Using config file: $CONFIG_FILE"
else
  echo "Error: '$CONFIG_FILE' does not exist or is not a regular file."
  exit 1
fi


## Get Project Config from API
USERNAME=`cat input/api-credentials.json  |jq .USERNAME | cut -d '"' -f2`
PASSWORD=`cat input/api-credentials.json  |jq .PASSWORD | cut -d '"' -f2`
TAIGA_URL=`cat $CONFIG_FILE  |jq .REPORT.TAIGA_API_URL | cut -d '"' -f2`
PROJECT_SLUG=`cat $CONFIG_FILE  |jq .REPORT.TAIGA_SLUG | cut -d '"' -f2`

# echo "Login to $TAIGA_URL for: $USERNAME"

DATA=$(jq --null-input \
        --arg username "$USERNAME" \
        --arg password "$PASSWORD" \
        '{ type: "normal", username: $username, password: $password }')

# echo $DATA


# Get AUTH_TOKEN
USER_AUTH_DETAIL=$( curl -k -X POST \
  -H "Content-Type: application/json" \
  -d "$DATA" \
  "$TAIGA_URL/auth" 2>/dev/null )

AUTH_TOKEN=$( echo ${USER_AUTH_DETAIL} | jq -r '.auth_token' )

# echo $USER_AUTH_DETAIL

# Exit if AUTH_TOKEN is not available
if [ -z ${AUTH_TOKEN} ]; then
    echo "Error: Incorrect username and/or password supplied"
    exit 1
# else
#     echo "auth_token is ${AUTH_TOKEN}"
fi



# curl -k -X GET -H "Content-Type: application/json" -H "Authorization: Bearer ${AUTH_TOKEN}" -s $TAIGA_URL/projects | jq '.[] | {id: .id, name: .name, slug: .slug}' > input/projects.json
# # PROJECTS=`curl -k -X GET -H "Content-Type: application/json" -H "Authorization: Bearer ${AUTH_TOKEN}" -s $TAIGA_URL/projects`
# # echo $PROJECTS | jq '.[] | {id: .id, name: .name, slug: .slug}'
# exit 1


PROJECT_NAME=`curl -k -X GET -H "Content-Type: application/json" -H "Authorization: Bearer ${AUTH_TOKEN}" -s $TAIGA_URL/projects/by_slug?slug=$PROJECT_SLUG | jq .slug | cut -d '"' -f2`
# echo $PROJECT_NAME

# echo "Project Config"
curl -k -X GET -H "Content-Type: application/json" -H "Authorization: Bearer ${AUTH_TOKEN}" -s $TAIGA_URL/projects/by_slug?slug=$PROJECT_SLUG | jq '{id: .id, name: .name, slug: .slug, description: .description, members: .members, issue_custom_attributes: .issue_custom_attributes, issue_duedates: .issue_duedates, issue_statuses: .issue_statuses, issue_types: .issue_types, issues_csv_uuid: .issues_csv_uuid, priorities: .priorities, severities: .severities, tags: .tags, tags_colors: .tags_colors }' > $report_base_dir/input/taiga-conf.json


## Generate CSV to JSON
inputs_dir=$report_base_dir'/input'
reports_dir=$report_base_dir'/reports'
csv_issues=`cat $CONFIG_FILE  |jq .FILES.INPUT_CSV | cut -d '"' -f2`
json_issues=`cat $CONFIG_FILE  |jq .FILES.INPUT_JSON | cut -d '"' -f2`
csv_issues=$(echo "$csv_issues" | sed "s|INPUT_DIR|$inputs_dir|g")
json_issues=$(echo "$json_issues" | sed "s|INPUT_DIR|$inputs_dir|g")


# Download latest CSV

csv_uuid=`cat $report_base_dir/input/taiga-conf.json | jq .issues_csv_uuid | cut -d '"' -f2`
curl -k -s -o $csv_issues "$TAIGA_URL/issues/csv?uuid=$csv_uuid"

# echo "inputs_dir: $inputs_dir"
# echo "csv_issues: $csv_issues"
# echo "json_issues: $json_issues"

csvtojson_bin=$report_base_dir'/node_modules/csvtojson/bin/csvtojson'

# echo "$csvtojson_bin $csv_issues > $json_issues"
$csvtojson_bin $csv_issues > $json_issues

time node $report_base_dir'/index.js' $CONFIG_FILE

echo "Find reports in: file:///$report_base_dir/reports"
