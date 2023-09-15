#!/usr/bin/env bash

report_base_dir=`echo $0 | sed -r 's/\/gen_report.sh//'`
if [ $report_base_dir == "." ]; then report_base_dir=`pwd`; fi

inputs_dir=$report_base_dir'/input'
reports_dir=$report_base_dir'/reports'

csvtojson_bin=$report_base_dir'/node_modules/csvtojson/bin/csvtojson'

$csvtojson_bin $inputs_dir'/issues-cfosit.csv' > $inputs_dir'/issues-cfosit.json'

node $report_base_dir'/index.js' $1
