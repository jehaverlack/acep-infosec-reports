# CFOS IT Taiga Support Request Report Generator Script

## CFOS IT Support Request Issues

- [https://tree.taiga.io/project/jbbaugher-2023-summer-cfos-it-support/issues](https://tree.taiga.io/project/jbbaugher-2023-summer-cfos-it-support/issues)

This script will generate HTML reports for based on the above Taiga tickets.

![cfosit-reports](input/cfosit-report-tn.png)


## Pre-Requisites

Install the following software on your local computer.

- Git: https://git-scm.com/
- Node.JS / NPM: https://nodejs.org/en
- jq for Windows: https://stedolan.github.io/jq/download/
- jq for Linux:  ```apt install jq```

### jq on Windows
- rename the jq-win64.exe binary to jq.exe
- move jq.exe to C:\Program Files\Git\usr\bin

## Cloning cfosit-reports

- [https://github.alaska.edu/cfos/cfosit-reports](https://github.alaska.edu/cfos/cfosit-reports)

1. Open a Git Bash terminal window.
2. Change directory to your **Documents** or other directory of your choosing:

```
cd Documents
```

3. Clone the cfosit-reports

```
git clone https://github.alaska.edu/cfos/cfosit-reports.git
```


4. Install NPM Dependancies

```
cd cfosit-reports
```

```
npm install
```


### Login Credentials
- copy input/api-credentials-example.json to input/api-credentials.json
- edit input/api-credentials.json with your Taiga Username and Password


## Generating a Weekly Report

### Update the Report Header Issue

1. Goto Issue 27: [https://tree.taiga.io/project/jbbaugher-2023-summer-cfos-it-support/issue/27](https://tree.taiga.io/project/jbbaugher-2023-summer-cfos-it-support/issue/27)
2. Update the **CFOS IT Report Header** Description with updated information for this weeks report.

###  Export Taiga CSV

1. Goto: [https://tree.taiga.io/project/jbbaugher-2023-summer-cfos-it-support/issues](https://tree.taiga.io/project/jbbaugher-2023-summer-cfos-it-support/issues)
2. Goto: **Settings** > **Project** > **Reports**
3. **Regenerate** the **Issues Report**
<!-- 4. Click **DOWNLOAD CSV**  and save to the **cfosit-reports/input** directory with filename **issues-cfosit.csv** -->

### Generate the Report

1. 1. Open a Git Bash terminal window.
2. Change directory to your **cfosit-reports** directory
```
cd Documents/cfosit-reports
```
3. Run the **gen_report.sh** script.
```
./gen_report.sh
```

### Viewing the Report:

1. Point your browser to:
- [file:///HOME_DIR/Documents/cfosit-reports/reports](file:///HOME_DIR/Documents/cfosit-reports/reports)
2. Click on the latest report HTML file.

### Print to PDF
1. Print the HTML Page to a PDF
- Enable printing Background Images
- Disable Printing Headers
- Print in Landscape Format for better table view.
- Name the PDF the same as the HTML report, but with a .pdf extention.


## Emailing Weekly Reports

1. Copy the HTML content of the report and paste in the Email message.
2. Attache the PDF version of the report.
3. Copy the Report Subject, e.g.:  _CFOS IT: 2023-04-07 Weekly Report_
4. Send to: jehaverlack@alaska.edu, jbbaugher@alaska.edu, jhsimonson@alaska.edu, tbuzzek@alaska.edu, tsshambare@alaska.edu, dkqueen@alaska.edu, sbmoran@alaska.edu, uaf-cfos-bof@alaska.edu


# Updating Configuration for a New Tiaga Project

## Edit input/config.json

1. Create a new Report Header Ticket in the new Taiga Instance 
1. update: REPORT : TAIGA_SLUG
1. update: REPORT: HEADER_ISSUE_NO

```
{
  "DIRS": {
    "INPUT_DIR":"DIRNAME/input",
    "TMP_DIR":"DIRNAME/tmp",
    "REPORT_DIR":"DIRNAME/reports"
  },
  "FILES": {
    "INPUT_CSV":"INPUT_DIR/issues-cfosit.csv",
    "INPUT_JSON":"INPUT_DIR/issues-cfosit.json",
    "TAIGA_CONFIG":"INPUT_DIR/cfos-it-support.json",
    "HTML_HEADER":"INPUT_DIR/head.html",
    "HTML_FOOTER":"INPUT_DIR/foot.html"
  },
  "REPORT":{
    "ORGANIZATION":"CFOS IT",
    "LOGO":"INPUT_DIR/cfos.png",
    "CONTEXT":"Support Requests",
    "PERIOD":"Weekly",
    "PERIOD_DAYS": 7,
    "TAIGA_SLUG":"jbbaugher-2023-summer-cfos-it-support",
    "TAIGA_URL":"https://tree.taiga.io/project/TAIGA_SLUG/issues",
    "TAIGA_TICKET_BASE_URL":"https://tree.taiga.io/project/TAIGA_SLUG/issue/",
    "TAIGA_API_URL":"https://api.taiga.io/api/v1/",
    "HEADER_ISSUE_NO":"8",
    "CONTACT_EMAIL":"uaf-cfos-it-support@alaska.edu"
  },
  "TABLE_COLS": {
    "id": "ID",
    "subject": "Issue",
    "dc": "Data Center",
    "sa": "Service Area",
    "type": "Type",
    "labels": "Labels",
    "priority": "Priority",
    "status": "Status",
    "assigned_to": "Assigned to",
    "latency": "Latency",
    "due_date": "Due Date"
  },
  "DATA_CENTERS":{
    "fbx": "Fairbanks Campus",
    "lp": "Lena Point Campus",
    "skq": "Sikuliaq",
    "smc": "Seward Marine Center",
    "cfos": "College of Fisheries and Ocean Sciences",
    "cfos it": "CFOS Information Techology"
  },
  "SERVICE_AREAS": {
    "ci": "Cyberinfrastructure",
    "email": "Email",
    "dt": "Desktop Support",
    "printers": "Printing",
    "research": "Research Support",
    "travel": "Travel",
    "web": "Websites"
  },
  "OTHER_TAGS": {
    "oit": "UA Office of Information Technology",
    "sddc": "Software Defined Data Center"
  }
}
```
