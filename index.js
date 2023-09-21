const fs      = require('fs')
const path    = require('path')
const os    = require('os')
const marked  = require('marked')

var cnf = JSON.parse(fs.readFileSync(path.join(__dirname, 'input', 'config.json'), 'utf8'))

var dir_maps = {
  "DIRNAME": __dirname,
  "HOME": os.homedir()
}

for (d in cnf['DIRS']) {
  for (dm in dir_maps) {
    cnf['DIRS'][d] = cnf['DIRS'][d].replace(RegExp(dm, 'g'), dir_maps[dm])
  }
  dir_maps[d] = cnf['DIRS'][d]
}

// console.log(JSON.stringify(dir_maps, null, 2))

for (f in cnf['FILES']) {
  for (dm in dir_maps) {
    cnf['FILES'][f] = cnf['FILES'][f].replace(RegExp(dm, 'g'), dir_maps[dm])
  }
}

for (r in cnf['REPORT']) {
  // console.log(r + ' ' + cnf['REPORT'][r])
  for (dm in dir_maps) {
    cnf['REPORT'][r] = String(cnf['REPORT'][r]).replace(RegExp(dm, 'g'), dir_maps[dm])
  }

  cnf['REPORT'][r] = String(cnf['REPORT'][r]).replace(RegExp('TAIGA_SLUG', 'g'), cnf['REPORT']['TAIGA_SLUG'])
}

// Time

cnf['TIME'] = {}
cnf['TIME']['NOW'] = tell_time()
cnf['TIME']['START'] = tell_time( Number(cnf['TIME']['NOW']['UTC']['EPOCH'] - 3600*24*cnf['REPORT']['PERIOD_DAYS']).toFixed(0) )  // Default to 1 week ago

let start_ts = Number(cnf['TIME']['START']['UTC']['EPOCH']).toFixed(0)

// Taiga Config

let taiga_cnf = JSON.parse(fs.readFileSync(path.join(cnf['FILES']["TAIGA_CONFIG"]), 'utf8'))

cnf['TAIGA'] = {}
cnf['TAIGA']['NAME']        = taiga_cnf['name']
cnf['TAIGA']['SLUG']        = taiga_cnf['slug']
cnf['TAIGA']['DESCRIPTION'] = taiga_cnf['description']
// cnf['TAIGA']['ROLES']       = taiga_cnf['roles']
cnf['TAIGA']['STATUSES']    = taiga_cnf['issue_statuses']
cnf['TAIGA']['DUE_DATES']   = taiga_cnf['issue_duedates']
cnf['TAIGA']['ISSUE_TYPES'] = taiga_cnf['issue_types']
cnf['TAIGA']['PRIORITIES']  = taiga_cnf['priorities']
cnf['TAIGA']['SEVERITIES']  = taiga_cnf['severities']
cnf['TAIGA']['TAG_COLORS']  = taiga_cnf['tags_colors']

let people = {}
let people_map = {}

for (m in taiga_cnf['members']) {
  people_map[taiga_cnf['members'][m]['id']] = taiga_cnf['members'][m]['username']
  people[taiga_cnf['members'][m]['username']] = taiga_cnf['members'][m]
}

// console.log(JSON.stringify(people, null, 2))
// console.log(JSON.stringify(people_map, null, 2))

// console.log(JSON.stringify(cnf, null, 2))


let issues = JSON.parse(fs.readFileSync(path.join(cnf['FILES']['INPUT_JSON'])))
let report_json = {}
let report_md = ''
let report_stats = {}

// let keys = Object.keys(issues[0])

// let ticket_base_url = 'https://ci.sikuliaq.alaska.edu/taiga/project/skq-it-support-requests/issue/'

var ticket_base_url = cnf['REPORT']['TAIGA_TICKET_BASE_URL']

let ignore_tickets = []
ignore_tickets.push(cnf['REPORT']['HEADER_ISSUE_NO'])


let sub_keys = cnf['TABLE_COLS']

let dflt = cnf['DEFAULT']

let datacenters = cnf['DATA_CENTERS']
// console.log(JSON.stringify(datacenters, null, 2))

let service_areas = cnf['SERVICE_AREAS']
// console.log(JSON.stringify(service_areas, null, 2))

let other_tags = cnf['OTHER_TAGS']
// console.log(JSON.stringify(other_tags, null, 2))

let status_map = {}
for (s in cnf['TAIGA']['STATUSES']) {
  status_map[cnf['TAIGA']['STATUSES'][s]['name']] = cnf['TAIGA']['STATUSES'][s]['color']
}
let stats_map = status_map

let severity_map = {}
for (s in cnf['TAIGA']['SEVERITIES']) {
  severity_map[cnf['TAIGA']['SEVERITIES'][s]['name']] = cnf['TAIGA']['SEVERITIES'][s]['color']
}

let priority_map = {}
for (p in cnf['TAIGA']['PRIORITIES']) {
  priority_map[cnf['TAIGA']['PRIORITIES'][p]['name']] = cnf['TAIGA']['PRIORITIES'][p]['color']
}
// console.log(JSON.stringify(priority_map, null, 2))

let issue_types = cnf['TAIGA']['ISSUE_TYPES']

let type_map = {}
for (t in cnf['TAIGA']['ISSUE_TYPES']) {
  type_map[cnf['TAIGA']['ISSUE_TYPES'][t]['name']] = cnf['TAIGA']['ISSUE_TYPES'][t]['color']
}

let types = {}
for (i in issues) {
  if (! types.hasOwnProperty(issues[i]['type'])) {
    types[issues[i]['type']] = true
  }
}


tags_colors = cnf['TAIGA']['TAG_COLORS']

let tags_map = {}
for (t in tags_colors) {
  tags_map[tags_colors[t][0]] = tags_colors[t][1]
}

// console.log(JSON.stringify(tags_colors, null, 2))
// console.log(JSON.stringify(tags_map, null, 2))

// for (dc in datacenters) {
//   report_json[dc] = {}
//   report_json[dc]['DATA_CENTER'] = datacenters[dc]
//   report_json[dc]['SERVICE_AREAS'] = {}
//
//   for (sa in service_areas) {
//     report_json[dc]['SERVICE_AREAS'][sa] = {}
//     report_json[dc]['SERVICE_AREAS'][sa]['TITLE'] = service_areas[sa]
//     report_json[dc]['SERVICE_AREAS'][sa]['TYPES'] = {}
//
//     for (ty in types) {
//       report_json[dc]['SERVICE_AREAS'][sa]['TYPES'][ty] = {}
//       report_json[dc]['SERVICE_AREAS'][sa]['TYPES'][ty]
//       report_json[dc]['SERVICE_AREAS'][sa]['TYPES'][ty]['ISSUES'] = []
//     }
//   }
//
// }

// process.exit(0)


let ntags = {}

for (i in issues) {
  let tags = issues[i]['tags'].split(',')
  let datacenter = []
  let service_area = []
  let other_tag = []
  let new_tags = []
  let type = []
  type.push(issues[i]['type'])

  for (t in tags) {
    // Data Center
    if (datacenters.hasOwnProperty(tags[t])) {
      datacenter.push(tags[t])
    }

    // if (datacenter.length == 0) { datacenter.push(dflt['DATA_CENTER']) }

    // Service Area
    if (service_areas.hasOwnProperty(tags[t])) {
      service_area.push(tags[t])
    }
    // if (service_area.length == 0) { service_area.push(dflt['SERVICE_AREA']) }

    // Other Tags
    if (other_tags.hasOwnProperty(tags[t])) {
      other_tag.push(tags[t])
    }
  }

  for (t in tags) {
    if((!datacenter.includes(tags[t]) && !service_area.includes(tags[t]) && tags[t]!='') || other_tag.hasOwnProperty(tags[t])) {
      new_tags.push(tags[t])
      ntags[tags[t]] = true
    }
  }

  // console.log("OTHER TAGS")
  // console.log(JSON.stringify(other_tags, null, 2))
  // console.log(JSON.stringify(other_tag, null, 2))
  // console.log(JSON.stringify(ntags, null, 2))

  issues[i]['dc'] = datacenter
  issues[i]['sa'] = service_area
  issues[i]['labels'] = new_tags

  // let issue = {}
  //
  // for (k in sub_keys) {
  //   issue[k] = issues[i][k]
  // }

  // let st = issues[i]['created_date'].replace(RegExp('[\.]{1}.*$'), '').replace(' ', 'T')
  // let start_time = tell_time(st)
  // let start = Number(start_time['UTC']['EPOCH']).toFixed(0)
  // let end = Number(now['UTC']['EPOCH']).toFixed(0)
  // if (issues[i]['is_closed'] == 'True') {
  //   if (issues[i]['finished_date']) {
  //     ft = issues[i]['finished_date'].replace(RegExp('[\.]{1}.*$'), '').replace(' ', 'T')
  //     let finish_time = tell_time(ft)
  //     end = Number(finish_time['UTC']['EPOCH']).toFixed(0)
  //   }
  // }
  // issues[i]['latency'] = pretty_time(Number(end - start)/1000)

  let created = tell_time( issues[i]['created_date'].replace(RegExp('[\.]{1}.*$'), 'Z').replace(' ', 'T') )
  let modified = tell_time( issues[i]['modified_date'].replace(RegExp('[\.]{1}.*$'), 'Z').replace(' ', 'T') )
  let finished = ''
  if (issues[i]['finished_date'] != '') {
    finished = tell_time( issues[i]['modified_date'].replace(RegExp('[\.]{1}.*$'), 'Z').replace(' ', 'T') )
  }

  issues[i]['created_ts'] = Number(created['UTC']['EPOCH']).toFixed(0)
  issues[i]['created_age'] = Number(cnf['TIME']['NOW']['UTC']['EPOCH'] - created['UTC']['EPOCH']).toFixed(0)
  issues[i]['modified_ts'] = Number(modified['UTC']['EPOCH']).toFixed(0)
  issues[i]['modified_age'] = Number(cnf['TIME']['NOW']['UTC']['EPOCH'] - modified['UTC']['EPOCH']).toFixed(0)
  if (finished != '') {
    issues[i]['finished_ts'] = Number(finished['UTC']['EPOCH']).toFixed(0)
    issues[i]['finished_age'] = Number(finished['UTC']['EPOCH'] - created['UTC']['EPOCH']).toFixed(0)
  } else {
    issues[i]['finished_ts'] = ''
    issues[i]['finished_age'] = ''
  }


  if (issues[i]['is_closed'] == 'True') {
    if (issues[i]['finished_age'] != '') {
      issues[i]['latency_secs'] = issues[i]['finished_age']
      issues[i]['latency'] = pretty_time(issues[i]['finished_age'])
    } else {
      issues[i]['latency_secs'] = issues[i]['modified_age']
      issues[i]['latency'] = pretty_time(issues[i]['modified_age'])
    }
  } else {
    issues[i]['latency_secs'] = issues[i]['modified_age']
    issues[i]['latency'] = pretty_time(issues[i]['modified_age'])
  }


  // for (d in datacenter) {
  //   for (s in service_area) {
  //     for (t in type) {
  //       report_json[ datacenter[d] ]['SERVICE_AREAS'][ service_area[s] ]['TYPES'][ type[t] ]['ISSUES'].push(issue)
  //     }
  //   }
  // }


}


// Generate Statistics
for (i in issues) {
  let tags = issues[i]['tags'].split(',')
  let datacenter = []
  let service_area = []
  let type = []
  type.push(issues[i]['type'])

  for (t in tags) {
    // Data Center
    if (datacenters.hasOwnProperty(tags[t])) {
      datacenter.push(tags[t])
    }

    // Service Area
    if (service_areas.hasOwnProperty(tags[t])) {
      service_area.push(tags[t])
    }
  }

  for (d in datacenter) {
    if (!report_stats.hasOwnProperty( datacenter[d] )) {
      report_stats[ datacenter[d] ] = {}
      report_stats[ datacenter[d] ]['STATS'] = {}
      report_stats[ datacenter[d] ]['STATS']['Open']    = 0
      report_stats[ datacenter[d] ]['STATS']['Pending'] = 0
      report_stats[ datacenter[d] ]['STATS']['Closed']  = 0
      report_stats[ datacenter[d] ]['STATS']['Total']   = 0
    }

    report_stats[ datacenter[d] ]['STATS']['Total']++
    switch (issues[i]['status']) {
      case 'Closed':
        report_stats[ datacenter[d] ]['STATS']['Closed']++
        break;
      case 'Rejected':
        report_stats[ datacenter[d] ]['STATS']['Closed']++
        break;
      case 'In progress':
        report_stats[ datacenter[d] ]['STATS']['Open']++
        break;
      default:
        report_stats[ datacenter[d] ]['STATS']['Pending']++
    }

    for (s in service_area) {
      if (!report_stats[ datacenter[d] ].hasOwnProperty( service_area[s] ) ) {
        report_stats[ datacenter[d] ][ service_area[s] ] = {}
        report_stats[ datacenter[d] ][ service_area[s] ]['STATS'] = {}
        report_stats[ datacenter[d] ][ service_area[s] ]['STATS']['Open']    = 0
        report_stats[ datacenter[d] ][ service_area[s] ]['STATS']['Pending'] = 0
        report_stats[ datacenter[d] ][ service_area[s] ]['STATS']['Closed']  = 0
        report_stats[ datacenter[d] ][ service_area[s] ]['STATS']['Total']   = 0
      }

      report_stats[ datacenter[d] ][ service_area[s] ]['STATS']['Total']++
      switch (issues[i]['status']) {
        case 'Closed':
          report_stats[ datacenter[d] ][ service_area[s] ]['STATS']['Closed']++
          break;
        case 'Rejected':
          report_stats[ datacenter[d] ][ service_area[s] ]['STATS']['Closed']++
          break;
        case 'In progress':
          report_stats[ datacenter[d] ][ service_area[s] ]['STATS']['Open']++
          break;
        default:
          report_stats[ datacenter[d] ][ service_area[s] ]['STATS']['Pending']++
      }

      for (t in type) {
        // console.log (datacenter[d] + ' : ' + service_area[s] + ' : ' + type[t] + ' : ' + issues[i]['status'])
        if (!report_stats[ datacenter[d] ][ service_area[s] ].hasOwnProperty( type[t] )) {
          report_stats[ datacenter[d] ][ service_area[s] ][ type[t] ] = {}
          report_stats[ datacenter[d] ][ service_area[s] ][ type[t] ]['STATS'] = {}
          report_stats[ datacenter[d] ][ service_area[s] ][ type[t] ]['STATS']['Open']    = 0
          report_stats[ datacenter[d] ][ service_area[s] ][ type[t] ]['STATS']['Pending'] = 0
          report_stats[ datacenter[d] ][ service_area[s] ][ type[t] ]['STATS']['Closed']  = 0
          report_stats[ datacenter[d] ][ service_area[s] ][ type[t] ]['STATS']['Total']   = 0
        }

        report_stats[ datacenter[d] ][ service_area[s] ][ type[t] ]['STATS']['Total']++
        switch (issues[i]['status']) {
          case 'Closed':
            report_stats[ datacenter[d] ][ service_area[s] ][ type[t] ]['STATS']['Closed']++
            break;
          case 'Rejected':
            report_stats[ datacenter[d] ][ service_area[s] ][ type[t] ]['STATS']['Closed']++
            break;
          case 'In progress':
            report_stats[ datacenter[d] ][ service_area[s] ][ type[t] ]['STATS']['Open']++
            break;
          default:
            report_stats[ datacenter[d] ][ service_area[s] ][ type[t] ]['STATS']['Pending']++
        }
      }
    }
  }
}


// for (d in datacenter) {
//   report_stats[ datacenter[d] ] = {}
//   report_stats[ datacenter[d] ]['Total'] = 0
//
//   for (s in service_area) {
//     report_stats[ datacenter[d] ][ service_area[s] ] = {}
//     report_stats[ datacenter[d] ][ service_area[s] ]['Closed']  = 0
//     report_stats[ datacenter[d] ][ service_area[s] ]['Open']    = 0
//     report_stats[ datacenter[d] ][ service_area[s] ]['Pending'] = 0
//     report_stats[ datacenter[d] ][ service_area[s] ]['Total'] = 0
//   }
// }





// console.log(JSON.stringify(issues, null, 2))
// console.log(JSON.stringify(report_json, null, 2))
// console.log(JSON.stringify(report_stats, null, 2))

// report_md += '<table>' + "\n"
// report_md += ' <tr>' + "\n"
// report_md += '  <td width="150px"><img title="Sikuliaq Network Diagram" alt="Sikuliaq Network Diagram" src="sikuliaqlogo.png" class="img-responsive img-rounded" style="width: 100px;"></td>' + "\n"
// report_md += '  <td><h1>Sikuliaq IT Weekly Update</h1><h2>' + week_ago['LOCAL']['YYYY-MM-DD'] + ' to ' + cnf['TIME']['NOW']['LOCAL']['YYYY-MM-DD'] + '</h2></td>' + "\n"
// report_md += ' <tr>' + "\n"
// report_md += '<table>' + "\n"

// console.log(start_ts)
// console.log(JSON.stringify(start, null, 2))


report_md += "\n"
// report_md += '# ' + cnf['REPORT']['ORGANIZATION'] + ': ' + cnf['TIME']['NOW']['LOCAL']['YYYY-MM-DD'] + ' Weekly Report' + "\n"
report_md += '# ' + cnf['TIME']['NOW']['LOCAL']['YYYY-MM-DD'] + ' Weekly Report' + "\n"
report_md += '- **Report Period:** ' + cnf['TIME']['START']['LOCAL']['YYYY-MM-DD'] + ' to ' + cnf['TIME']['NOW']['LOCAL']['YYYY-MM-DD'] + "\n"
report_md += '- **Issues:** [' + cnf['REPORT']['ORGANIZATION'] + ' ' + cnf['REPORT']['CONTEXT'] + ' Issues](' + cnf['REPORT']['TAIGA_URL'] + ')' + "\n"
report_md += '- **Support Contact:** Please send support requests to:' + '<a href="mailto:' + cnf['REPORT']['CONTACT_EMAIL'] +'">' + cnf['REPORT']['CONTACT_EMAIL'] +'</a>' + "\n"
report_md += "\n"

// Summary

let stats_legend = ''
for (mp in stats_map) {
  switch (mp) {
    case 'Total':
      stats_legend = stats_legend.replace(RegExp('[\+] $'), '')
      stats_legend += ' = <span style="color: ' + stats_map[mp] + '">' + mp +' </span>'

      break;
    default:
      stats_legend += '<span style="color: ' + stats_map[mp] + '">' + mp +' </span> + '
  }
}

// let json_stats_table = stats_to_json_table(report_stats)
// report_md += '## Summary' + "\n"
// report_md += '**Number of Issues:** ' + stats_legend
// report_md += "\n"
// report_md += json_to_md_table(json_stats_table)
// report_md += "\n"


let new_active_closed = {}


for (i in issues) {
  if (issues[i]['ref'] == cnf['REPORT']['HEADER_ISSUE_NO']) { // Report Header Ticket
    // console.log(JSON.stringify(issues[i], null, 2))
    report_md += issues[i]['description'].replace(/#([0-9]+)/g, `[#$1](${ticket_base_url}$1)`);
  }
}
report_md += "\n"



// let json_issues_table = issues_to_json_table(issues)
report_md += "\n"
report_md += '# Activity' + "\n"
report_md += "\n"
report_md += "**This active report summarizes Highlights, Closed, New, Active and Idle issues for the week.**\n"
report_md += "- For access to issue details please contact <a href='mailto:jehaverlack@alaska.edu'>jehaverlack@alaska.edu</a>\n"
report_md += "\n"

// report_md += "\n"
// report_md += json_to_md_table(json_issues_table)
// report_md += "\n"

let legend_table = []
// let ltval = {"Legend":"Values"}
// legend_table.push(ltval)

let ltval = {}
ltval['Legend'] = "Projects"
ltval['Values'] = ''
for (k in datacenters) {
  ltval['Values'] += '<span title="' + datacenters[k] + '" style="color: #fff; border-radius: 2px; padding-top: 0.1rem; padding-right: 0.5rem; padding-bottom: 0.1rem; padding-left: 0.5rem; background-color: ' + tags_colors[k] + '">' + k + '</span> '
  // ltval['Values'] += '<span style="color: #fff; border-radius: 2px; padding-top: 0.1rem; padding-right: 0.5rem; padding-bottom: 0.1rem; padding-left: 0.5rem; background-color: ' + tags_map[k] + '">' + k + '</span>' + ' <span style="color: ' + tags_map[k] + '">' + datacenters[k] + '</span>, '
  // ltval['Values'] += '<span style="color: ' + tags_map[k] + '">' + datacenters[k] + '</span>, '
}
ltval['Values'] = ltval['Values'].replace(RegExp(', $'), '')
legend_table.push(ltval)

ltval = {}
ltval['Legend'] = "Departments"
ltval['Values'] = ''
for (k in service_areas) {
  ltval['Values'] += '<span title="' + service_areas[k] + '" style="color: #fff; border-radius: 2px; padding-top: 0.1rem; padding-right: 0.5rem; padding-bottom: 0.1rem; padding-left: 0.5rem; background-color: ' + tags_colors[k] + '">' + k + '</span> '

  // ltval['Values'] += '<span style="color: #fff; border-radius: 2px; padding-top: 0.1rem; padding-right: 0.5rem; padding-bottom: 0.1rem; padding-left: 0.5rem; background-color: ' + tags_map[k] + '">' + k + '</span>' + ' <span style="color: ' + tags_map[k] + '">' + service_areas[k] + '</span>, '
  // ltval['Values'] += '<span style="color: ' + tags_map[k] + '">' + service_areas[k] + '</span>, '
}
ltval['Values'] = ltval['Values'].replace(RegExp(', $'), '')
legend_table.push(ltval)

// console.log('ntags: ' + JSON.stringify(ntags, null, 2))
// console.log('othertags: ' + JSON.stringify(other_tags, null, 2))

ltval = {}
ltval['Legend'] = "Tags"
ltval['Values'] = ''
// for (k in ntags) {
  for (k in other_tags) {
  ltval['Values'] += '<span title="' + other_tags[k] + '" style="color: #fff; border-radius: 2px; padding-top: 0.1rem; padding-right: 0.5rem; padding-bottom: 0.1rem; padding-left: 0.5rem; background-color: ' + tags_colors[k] + '">' + k + '</span> '

  // ltval['Values'] += '<span style="color: #fff; border-radius: 2px; padding-top: 0.1rem; padding-right: 0.5rem; padding-bottom: 0.1rem; padding-left: 0.5rem; background-color: ' + tags_map[k] + '">' + k + '</span>' + ' <span style="color: ' + tags_map[k] + '">' + other_tags[k] + '</span>, '
  // ltval['Values'] += '<span style="color: ' + tags_map[k] + '">' + k + '</span>, '
  }

  for (k in ntags) {
    if (!other_tags.hasOwnProperty(k)) {
      ltval['Values'] += '<span style="color: #fff; border-radius: 2px; padding-top: 0.1rem; padding-right: 0.5rem; padding-bottom: 0.1rem; padding-left: 0.5rem; background-color: ' + tags_colors[k] + '">' + k + '</span> '
    }
  }
ltval['Values'] = ltval['Values'].replace(RegExp(', $'), '')
legend_table.push(ltval)

ltval = {}
ltval['Legend'] = "Types"
ltval['Values'] = ''
for (k in type_map) {
  ltval['Values'] += '<span style="color: ' + type_map[k] + '">' + k + '</span>, '
}
ltval['Values'] = ltval['Values'].replace(RegExp(', $'), '')
legend_table.push(ltval)

ltval = {}
ltval['Legend'] = "Priority"
ltval['Values'] = ''
for (k in priority_map) {
  ltval['Values'] += '<span style="color: ' + priority_map[k] + '">' + k + '</span>, '
}
ltval['Values'] = ltval['Values'].replace(RegExp(', $'), '')
legend_table.push(ltval)

ltval = {}
ltval['Legend'] = "Status"
ltval['Values'] = ''
for (k in status_map) {
  ltval['Values'] += '<span style="color: ' + status_map[k] + '">' + k + '</span>, '
}
ltval['Values'] = ltval['Values'].replace(RegExp(', $'), '')
legend_table.push(ltval)

// console.log (JSON.stringify(legend_table, null, 2))

report_md += json_to_md_table(legend_table)
// report_md += json_to_md_table(dc_table)
// report_md += json_to_md_table(sa_table)

// console.log(JSON.stringify(issues, null, 2))


// // Special Projects
// let special_issues = []
// for (i in issues) {
//   if (issues[i]['ref'] != cnf['REPORT']['HEADER_ISSUE_NO']) {
//     if (issues[i]['tags'].includes('may 2023')) {
//       special_issues.push(issues[i])
//     }
//   }
// }
//
// // console.log(JSON.stringify(special_issues, null, 2))
//
// let special_issues_table = issues_to_json_table(special_issues)
// // console.log(JSON.stringify(special_issues_table, null, 2))
// report_md += "---\n"
// report_md += '## May 2023 Priorities' + "\n"
// if (special_issues_table.length > 0) {
//   report_md += special_issues_table.length + " May 2023 Priority Issues.\n"
//   report_md += "\n"
//   report_md += json_to_md_table(special_issues_table)
//   report_md += "\n"
// } else {
//   report_md += "\n"
//   report_md += "- No issues were **May 2023 Priority** issues.\n"
// }


// Weekly Highlights
let highlights = []
let highlight_severities = ['Important', 'Critical']
let highlight_priority = ['High', 'Urgent']
for (i in issues) {
  if (issues[i]['ref'] != cnf['REPORT']['HEADER_ISSUE_NO']) {
    if (highlight_severities.includes( issues[i]['severity']) ) {
    // if (highlight_severities.includes( issues[i]['severity'] ) || highlight_priority.includes( issues[i]['priority'] )) {
      highlights.push(issues[i])
    }
  }
}

let highlights_table = issues_to_json_table(highlights)
// console.log(JSON.stringify(highlights_table, null, 2))
report_md += "---\n"
// report_md += '## Weekly Highlights' + "\n"
report_md += '<h2 style="background-color: #ff0;">Weekly Highlight Summary</h2>' + "\n"
if (highlights_table.length > 0) {
  report_md += highlights_table.length + " May 2023 Priority Issues.\n"
  report_md += "\n"
  report_md += json_to_md_table(highlights_table)
  report_md += "\n"
} else {
  report_md += "\n"
  report_md += "- No issues were **May 2023 Priority** issues.\n"
}

// Closed

let closed_issues = []
for (i in issues) {
  if (issues[i]['ref'] != cnf['REPORT']['HEADER_ISSUE_NO'] && issues[i]['finished_ts'] != '') {
    if (issues[i]['finished_ts'] > start_ts) {
      closed_issues.push(issues[i])
      new_active_closed[issues[i]['ref']] = true
    }
  }
}

// console.log(JSON.stringify(closed_issues, null, 2))

let closed_issues_table = issues_to_json_table(closed_issues)
// console.log(JSON.stringify(closed_issues_table, null, 2))
report_md += "---\n"
report_md += '## Closed Issues' + "\n"
if (closed_issues_table.length > 0) {
  report_md += closed_issues_table.length + " issues **Closed** this week.\n"
  report_md += "\n"
  report_md += json_to_md_table(closed_issues_table)
  report_md += "\n"
} else {
  report_md += "\n"
  report_md += "- No issues were **Closed** this week.\n"
}



let new_issues = []
for (i in issues) {
  if (issues[i]['ref'] != cnf['REPORT']['HEADER_ISSUE_NO'] && issues[i]['created_ts'] > start_ts) {
    new_issues.push(issues[i])
    new_active_closed[issues[i]['ref']] = true
  }
}

// console.log(JSON.stringify(new_issues, null, 2))


if (new_issues.length > 0) {
  let new_issues_table = issues_to_json_table(new_issues)
  report_md += "---\n"
  report_md += '## New Issues' + "\n"
  if (new_issues_table.length > 0) {
    report_md += new_issues_table.length + " issues **Added** this week.\n"
    report_md += "\n"
    report_md += json_to_md_table(new_issues_table)
    report_md += "\n"
  } else {
    report_md += "\n"
    report_md += "- No issues were **Created** this week.\n"
  }
} else {
  report_md += "\n"
  report_md += "- No issues were **Created** this week.\n"
}



let active_issues = []
for (i in issues) {
  if (issues[i]['ref'] != cnf['REPORT']['HEADER_ISSUE_NO'] && issues[i]['modified_ts'] > start_ts) {
    if (issues[i]['status'] != "New" && issues[i]['status'] != "Closed") {
      active_issues.push(issues[i])
      new_active_closed[issues[i]['ref']] = true
    }
  }
}

let active_issues_table = issues_to_json_table(active_issues)
report_md += "---\n"
report_md += '## Active Issues' + "\n"
report_md += active_issues_table.length + " issues **Active** (but not New or Closed) this week.\n"
report_md += "\n"
report_md += json_to_md_table(active_issues_table)
report_md += "\n"




let idle_issues = []
for (i in issues) {
  // if (issues[i]['modified_ts'] <= start_ts) {
  if (issues[i]['ref'] != cnf['REPORT']['HEADER_ISSUE_NO'] && ! new_active_closed.hasOwnProperty(issues[i]['ref']) ) {
    if (issues[i]['status'] != "Rejected" && issues[i]['status'] != "Closed") {
      idle_issues.push(issues[i])
    }
  }
  // }
}

let idle_issues_table = issues_to_json_table(idle_issues)
report_md += "---\n"
report_md += '## Idle Issues' + "\n"
report_md += idle_issues_table.length + " **Idle** issues.\n"
report_md += "\n"
if (idle_issues.length > 0) {
  report_md += json_to_md_table(idle_issues_table)
} else {
  report_md += "There are no Idle Issues in this report"
}

report_md += "\n"





// for (dc in report_json) {
//   report_md += '---'
//   report_md += "\n"
//   report_md += '# Location: ' + report_json[dc]['DATA_CENTER'] + "\n"
//   report_md += "\n"
//   for (sa in report_json[dc]['SERVICE_AREAS']) {
//     for (ty in report_json[dc]['SERVICE_AREAS'][sa]['TYPES']) {
//       if (report_json[dc]['SERVICE_AREAS'][sa]['TYPES'][ty]['ISSUES'].length > 0) {
//         report_md += '## Service Area: ' + report_json[dc]['SERVICE_AREAS'][sa]['TITLE'] + "\n"
//         report_md += "\n"
//         report_md += '### Issue Type: ' + ty + "\n"
//         report_md += "\n"
//         report_md += report_json[dc]['SERVICE_AREAS'][sa]['TYPES'][ty]['ISSUES'].length + ' Issues' + "\n"
//         report_md += "\n"
//         report_md += issues_to_md_table(report_json[dc]['SERVICE_AREAS'][sa]['TYPES'][ty]['ISSUES'])
//         report_md += "\n"
//       }
//     }
//   }
// }

let report_name = cnf['REPORT']['ORGANIZATION'].replace(RegExp(' ', 'g'), '_') + '_' + cnf['TIME']['NOW']['LOCAL']['YYYY-MM-DD'] + '_' + cnf['REPORT']['PERIOD'].replace(RegExp(' ', 'g'), '_') + '_Report'
// let generic_report_name = cnf['TAIGA']['SLUG']
let generic_report_name = cnf['REPORT']['ORGANIZATION'].replace(RegExp(' ', 'g'), '_') + '_' + cnf['REPORT']['PERIOD'].replace(RegExp(' ', 'g'), '_') + '_Report'


fs.writeFileSync(path.join(cnf['DIRS']['REPORT_DIR'], report_name + '.md'), report_md, 'utf8')

let report_html = fs.readFileSync(path.join(cnf['FILES']['HTML_HEADER']), 'utf8')
report_html += marked.parse(report_md)
report_html += fs.readFileSync(path.join(cnf['FILES']['HTML_FOOTER']), 'utf8')

report_html = report_html.replace(RegExp('\<table\>', 'g'), '<table class="table table-responsive table-striped table-bordered html_table">')

fs.writeFileSync(path.join(cnf['DIRS']['REPORT_DIR'], report_name + '.html'), report_html, 'utf8')
fs.writeFileSync(path.join(cnf['DIRS']['REPORT_DIR'], generic_report_name + '.html'), report_html, 'utf8')


function json_to_md_table(json_table) {

  // console.log(JSON.stringify(json_table, null, 2))

  let markdown_header_row =''
  let markdown_col_row = ''
  let markdown_rows = ''
  let markdown_table = ''

  let cols = []

  if (json_table.length > 0) {
    cols = Object.keys(json_table[0])

    for (c in cols) {
      if (c < (cols.length -1)) {
        markdown_header_row += '<u>' + cols[c] + '</u>' + ' | '
        markdown_col_row += ':--- | '
      } else {
        markdown_header_row += '<u>' + cols[c] + '</u>'  + "\n"
        markdown_col_row += ':---' + "\n"
      }
    }

    // console.log(JSON.stringify(cols, null, 2))

    for (r in json_table) {
      for (c in cols) {
        if (c < (cols.length - 1)) {
          markdown_rows += json_table[r][ cols[c] ] + ' | '
        } else {
          markdown_rows += json_table[r][ cols[c] ] + "\n"
        }
      }
    }
  }


  markdown_table += markdown_header_row
  markdown_table += markdown_col_row
  markdown_table += markdown_rows

  // console.log(markdown_table)
  return markdown_table
}


// Function Libraryies
function issues_to_json_table(issues) {
  console.log('issues')
  console.log(JSON.stringify(issues, null, 2))
  let json_table = []

  let id_dc_map = [];

  issues.forEach(item => {
    let map_obj = {
                    // issuesid: item,
                    id: item.id,
                    subject: String(item.subject),
                    dc: String(item.dc[0]),
                    sa: String(item.sa[0]),
                    type: String(item.type),
                    owner: String(item.owner),
                    severity: String(item.severity),
                    priority: String(item.priority),
                    status: String(item.status),
                    due_date: String(item.due_date)
                  };
    id_dc_map.push(map_obj)
  });

  for (idx in id_dc_map) {
    id_dc_map[idx]['idx'] = idx
  }


  // id_dc_map.sort((a, b) => {
  //   // First, compare by dc
  //   if (a.dc.toUpperCase() < b.dc.toUpperCase()) {
  //     return -1;
  //   } else if (a.dc.toUpperCase() > b.dc.toUpperCase()) {
  //     return 1;
  //   } else {
  //     // If dc values are equal, compare by sa
  //     if (a.sa && b.sa) {
  //       if (a.sa.toUpperCase() < b.sa.toUpperCase()) {
  //         return -1;
  //       } else if (a.sa.toUpperCase() > b.sa.toUpperCase()) {
  //         return 1;
  //       } else {
  //         return 0;
  //       }
  //     } else if (a.sa) {
  //       return -1;
  //     } else if (b.sa) {
  //       return 1;
  //     } else {
  //       return 0;
  //     }
  //   }
  // });

  id_dc_map.sort((a, b) => {
    // First, compare by priority
    if (a.priority.toUpperCase() < b.priority.toUpperCase()) {
      return -1;
    } else if (a.priority.toUpperCase() > b.priority.toUpperCase()) {
      return 1;
    } else {
      // If priority values are equal, compare by status
      if (a.status && b.status) {
        if (a.status.toUpperCase() < b.status.toUpperCase()) {
          return -1;
        } else if (a.status.toUpperCase() > b.status.toUpperCase()) {
          return 1;
        } else {
          return 0;
        }
      } else if (a.status) {
        return -1;
      } else if (b.status) {
        return 1;
      } else {
        return 0;
      }
    }
  });

  // console.log('Sorting:....')
  console.log('id_dc_map')
  console.log(JSON.stringify(id_dc_map, null, 2))
  // console.log(JSON.stringify(id_dc_map_sorted, null, 2))

  // console.log(JSON.stringify(issues, null, 2))


  // for (i in issues) {
  for (idx in id_dc_map) {
    let i = id_dc_map[idx]['idx']
    let row = {}
    for (k in sub_keys) {
      // if (sub_keys.hasOwnProperty(k)) {

      // console.log(i + ' ' + k + ' ' + sub_keys[k])
        switch (k) {
          case 'id':
            row[sub_keys[k]] = '[' + issues[i]['ref'] + '](' + ticket_base_url + issues[i]['ref'] +  ')'
            break;
          case 'subject':
            row[sub_keys[k]] = '[' + issues[i][k] + '](' + ticket_base_url + issues[i]['ref'] +  ')'
            break;
          case 'dc':
            let dcs = ''
            for (dc in issues[i][k]) {
               // dcs += '<span style="color: ' + tags_map[ issues[i][k][dc] ] + '">' + datacenters[ issues[i][k][dc] ] + '</span> '

               dcs += '<span title="' + datacenters[ issues[i][k][dc] ] + '" style="color: #fff; border-radius: 2px; padding-top: 0.1rem; padding-right: 0.5rem; padding-bottom: 0.1rem; padding-left: 0.5rem; background-color: ' + tags_colors[issues[i][k][dc]] + '">' + issues[i][k][dc] + '</span>'
            }
            row[sub_keys[k]] = dcs
            break;
          case 'sa':
            let sas = ''
            for (sa in issues[i][k]) {
               // sas += '<span style="color: ' + tags_map[ issues[i][k][sa] ] + '">' + service_areas[ issues[i][k][sa] ] + '</span> '

               sas += '<span title="' + service_areas[ issues[i][k][sa] ] + '" style="color: #fff; border-radius: 2px; padding-top: 0.1rem; padding-right: 0.5rem; padding-bottom: 0.1rem; padding-left: 0.5rem; background-color: ' + tags_colors[issues[i][k][sa]] + '">' + issues[i][k][sa] + '</span>'
            }
            row[sub_keys[k]] = sas
            break;
          case 'labels':
            let lbl = ''
            for (l in issues[i][k]) {
               // lbl += '<span style="color: ' + tags_map[ issues[i][k][l] ] + '">' + issues[i][k][l] + '</span> '

               lbl += '<span title="' + other_tags[ issues[i][k][l] ] + '" style="color: #fff; border-radius: 2px; padding-top: 0.1rem; padding-right: 0.5rem; padding-bottom: 0.1rem; padding-left: 0.5rem; background-color: ' + tags_colors[issues[i][k][l]] + '">' + issues[i][k][l] + '</span>'
            }
            row[sub_keys[k]] = lbl
            break;          case 'priority':
            row[sub_keys[k]] = '<span style="color: ' + priority_map[ issues[i][k] ] + '">' + issues[i][k] + '</span>'
            break;
          case 'status':
            row[sub_keys[k]] = '<span style="color: ' + status_map[ issues[i][k] ] + '">' + issues[i][k] + '</span>'
            break;
          case 'severity':
            row[sub_keys[k]] = '<span style="color: ' + severity_map[ issues[i][k] ] + '">' + issues[i][k] + '</span>'
            break;
          case 'type':
            row[sub_keys[k]] = '<span style="color: ' + type_map[ issues[i][k] ] + '">' + issues[i][k] + '</span>'
            break;
          case 'watchers':
            row[sub_keys[k]] = people_map[ issues[i][k] ]
            break;
          default:
            row[sub_keys[k]] = issues[i][k]
        }
      // }
    }
    json_table.push(row)
  }

  // console.log(JSON.stringify(json_table, null, 2))

  return json_table
}


function stats_to_json_table(stats) {
  let json_table = []

  let sak = Object.keys(service_areas)
  let sa = Object.values(service_areas)

  let dc = Object.values(datacenters)
  let dck = Object.keys(datacenters)
  dc.unshift('Service Area (down) / Data Center (accross)')
  dck.unshift('')

  for (s in sa) {
    let row = {}
    for (d in dc) {
      // console.log(s + ' - ' + sa[s] + ' : '+ d + ' - ' + dc[d] + ' => ' + sak[s]  + ' : ' + dck[d])

      if (d == 0) {
        row[ dc[d] ] = '**' + sa[s] + ' ('+ sak[s] +')' + "**"
      } else {
        let stat_val = ''

        if (stats.hasOwnProperty(dck[d])) {
          if (stats[dck[d]].hasOwnProperty(sak[s])) {
            for (st in stats[ dck[d] ][ sak[s] ]['STATS']) {
              switch (st) {
                case 'Total':
                  stat_val = stat_val.replace(RegExp('[\+] $'), '')
                  stat_val +=  ' = <span title="' + st + '" style="color: ' + stats_map[st] + '">' + stats[ dck[d] ][ sak[s] ]['STATS'][st] + '</span> '

                  break;
                default:
                  stat_val +=  '<span title="' + st + '" style="color: ' + stats_map[st] + '">' + stats[ dck[d] ][ sak[s] ]['STATS'][st] + '</span> + '
              }
            }
          }
        }

        row[ dc[d] + ' (' + dck[d] + ')' ] = stat_val
      }
    }
    json_table.push(row)
  }

  // console.log(JSON.stringify(json_table, null, 2))

  return json_table
}


function stats_to_md_table(stats) {
  let markdown_header_row =''
  let markdown_col_row = ''
  let markdown_stat = ''
  let markdown_table = ''

  let dc = Object.values(datacenters)
  let dck = Object.keys(datacenters)
  dc.unshift('Service Area (down) / Data Center (accross) ')
  dck.unshift('')
  let sak = Object.keys(service_areas)
  let sa = Object.values(service_areas)

 // console.log(JSON.stringify(dc, null, 2))
 // console.log(JSON.stringify(sa, null, 2))
  // markdown_header_row +=  ' _ | '
  // markdown_col_row += '--- | '

  for (d in dc) {
    if (d < (dc.length - 1)) {
      if (dck[d]) {
        markdown_header_row += dc[d] + ' (' + dck[d] + ')' + ' | '
        markdown_col_row += ':--- | '
      } else {
        markdown_header_row += dc[d] + ' | '
        markdown_col_row += ':--- | '
      }
    } else {
      markdown_header_row += dc[d] + ' (' + dck[d] + ')' + "\n"
      markdown_col_row += ':---' + "\n"
    }
  }

  for (s in sa) {

    for (d in dc) {
      // console.log(dc[d]  + ' : ' + sa[s])
      // console.log(sa[s] + ' : ' + dc[d])

      if (d == 0) {
        markdown_stat += '**' + sa[s] + ' ('+ sak[s] +')' + "** |"
      // }
      } else {
        let stat_val = ''

        if (stats.hasOwnProperty(dck[d])) {
          if (stats[dck[d]].hasOwnProperty(sak[s])) {
            for (st in stats[ dck[d] ][ sak[s] ]['STATS']) {
              // stat_val +=  st.charAt(0) + ' ' + stats[ dck[d] ][ sak[s] ]['STATS'][st] + ', '
              switch (st) {
                case 'Total':
                  stat_val = stat_val.replace(RegExp('[\+] $'), '')
                  stat_val +=  ' = <span title="' + st + '" style="color: ' + stats_map[st] + '">' + stats[ dck[d] ][ sak[s] ]['STATS'][st] + '</span> '

                  break;
                default:
                  stat_val +=  '<span title="' + st + '" style="color: ' + stats_map[st] + '">' + stats[ dck[d] ][ sak[s] ]['STATS'][st] + '</span> + '

              }
              // stat_val +=  '<span title="' + st + '" style="color: ' + stats_map[st] + '">' + stats[ dck[d] ][ sak[s] ]['STATS'][st] + '</span> '
            }
            // stat_val = stats[ dck[d] ][ sak[s] ]['STATS']['Total']

          }
        }

        if (d < (dc.length - 1)) {
          // markdown_stat += ' a |'
          markdown_stat += ' ' + stat_val + ' |'
        } else {
          markdown_stat +=  ' ' + stat_val + "\n"
        }
      }


      // if (stats.hasOwnProperty(dc[d])) {
      //   if (stats[dc[d]].hasOwnProperty(sa[s])) {
      //     if (s < (sa.length -1)) {
      //       markdown_stat += ' a |'
      //     } else {
      //       markdown_stat += ' a ' + "\n"
      //     }
      //   } else {
      //     if (s < (sa.length -1)) {
      //       markdown_stat += sa[s] + ' |'
      //     } else {
      //       markdown_stat += sa[s] + "\n"
      //     }
      //   }
      // } else {
      //   if (s < (sa.length -1)) {
      //     markdown_stat += dc[d] + ' |'
      //   } else {
      //     markdown_stat += dc[d] + "\n"
      //   }
      // }
    }
  }

  markdown_table += markdown_header_row
  markdown_table += markdown_col_row
  markdown_table += markdown_stat

// console.log(markdown_table)

  return markdown_table
}

function issues_to_md_table(issues) {
  let markdown_header_row =''
  let markdown_col_row = ''
  let markdown_issues = ''
  let markdown_table = ''
  // let stats = {}
  //
  // stats['New'] = 0
  // stats['In progress'] = 0
  // stats['Ready for test'] = 0
  // stats['Closed'] = 0
  // stats['Needs Info'] = 0
  // stats['Rejected'] = 0
  // stats['Postponed'] = 0


  let keys = Object.keys(issues[0])

  // console.log(JSON.stringify(keys))
  // console.log(keys.length)

  for (k in keys) {
    // console.log(k + ' ' + keys[k])
    if (k < (keys.length - 1)) {
      markdown_header_row += sub_keys[ keys[k] ] + ' | '
      markdown_col_row += '--- | '
    } else {
      markdown_header_row += sub_keys[ keys[k] ] + "\n"
      markdown_col_row += '---' + "\n"
    }
  }

  for (i in issues) {
    for (k in keys) {
      let val = ''
      switch (keys[k]) {
        case 'id':
          val = '[' + issues[i][ keys[k] ] + '](' + ticket_base_url + issues[i][ keys[k] ] + ')'
          break;
        case 'subject':
          val = '[' + issues[i][ keys[k] ] + '](' + ticket_base_url + issues[i]['ref'] + ')'
          break;
        case 'status':
          val = '<span style="color: ' + status_map[ issues[i][ keys[k] ] ] + '">' + issues[i][ keys[k] ] + '</span>'
          break;
        case 'priority':
          val = '<span style="color: ' + priority_map[ issues[i][ keys[k] ] ] + '">' + issues[i][ keys[k] ] + '</span>'
          break;
        case 'severity':
          val = '<span style="color: ' + severity_map[ issues[i][ keys[k] ] ] + '">' + issues[i][ keys[k] ] + '</span>'
          break;
        default:
          val = issues[i][ keys[k] ]
      }

      if (k < (keys.length - 1)) {
        markdown_issues += val + ' | '
      } else {
        markdown_issues += val + "\n"
      }
    }
  }

  markdown_table += markdown_header_row
  markdown_table += markdown_col_row
  markdown_table += markdown_issues

  return markdown_table
}

function pretty_time(seconds) {

  let ptime = seconds + ' Secs'

  if (seconds > 31536000) {
    ptime = Number(seconds / 31536000).toFixed(0) + ' Years'
  } else if (seconds > 2721600) {
    ptime = Number(seconds / 2721600).toFixed(0) + ' Months'
  } else if (seconds > 86400) {
    ptime = Number(seconds / 86400).toFixed(0) + ' Days'
  } else if (seconds > 3600) {
    ptime = Number(seconds / 3600).toFixed(0) + ' Hours'
  } else if (seconds > 120) {
    ptime = Number(seconds / 60).toFixed(0) + ' Minutes'
  }

  // if (seconds > 120) {
  //   ptime = Number(seconds / 60).toFixed(0) + ' Minutes'
  // } else if (seconds > 3600) {
  //   ptime = Number(seconds / 3600).toFixed(0) + ' Hours'
  // } else if (seconds > 86400) {
  //   ptime = Number(seconds / 3600).toFixed(0) + ' Days'
  // } else if (seconds > 2721600) {
  //   ptime = Number(seconds / 2721600).toFixed(0) + ' Months'
  // } else if (seconds > 31536000) {
  //   ptime = Number(seconds / 31536000).toFixed(0) + ' Years'
  // }

  return ptime
}


function tell_time (ts) {
  // Consider: https://github.com/date-fns/date-fns

       var timeds = {} // Time Data Structure
       var time = new Date()

       var dowmap = [
         '',
         'Sun',
         'Mon',
         'Tue',
         'Wed',
         'Thu',
         'Fri',
         'Sat'
       ]

       var monmap = [
         '',
         'Jan',
         'Feb',
         'Mar',
         'Apr',
         'May',
         'Jun',
         'Jul',
         'Aug',
         'Sep',
         'Oct',
         'Nov',
         'Dec'
       ]

       if(ts) {
         if(String(ts).match(/^\d+$/)) {
           time = new Date(ts*1000)
         } else {
           if (isValidDate(ts)) {
             time = new Date(ts)
           } else {
             let err = { "ERROR": "Invalid Date: " + ts }
             return err
           }
         }
       }

       timeds['LOCAL'] = {}

       timeds['LOCAL']['YYYY']  = '' + time.getFullYear() + '';
       timeds['LOCAL']['MM'] = zp(Number(time.getMonth() + 1), 2)
       timeds['LOCAL']['DD'] = zp(time.getDate(), 2)
       timeds['LOCAL']['hh'] = zp(time.getHours(), 2)
       timeds['LOCAL']['mm'] = zp(time.getMinutes(), 2)
       timeds['LOCAL']['ss'] = zp(time.getSeconds(), 2)

       timeds['LOCAL']['ms'] = time.getMilliseconds()

       timeds['LOCAL']['YYYY-MM-DD']   = timeds['LOCAL']['YYYY'] + '-' + timeds['LOCAL']['MM'] + '-' + timeds['LOCAL']['DD'];
       timeds['LOCAL']['hh:mm:ss']     = timeds['LOCAL']['hh'] + ':' + timeds['LOCAL']['mm'] + ':' + timeds['LOCAL']['ss'];
       timeds['LOCAL']['YYYY-MM-DD hh:mm:ss'] =  timeds['LOCAL']['YYYY-MM-DD'] + ' ' + timeds['LOCAL']['hh:mm:ss'];

       timeds['LOCAL']['DOW']   = Number(time.getDay() +1);
   //    timeds['LOCAL']['DOY']   = '';
       timeds['LOCAL']['WOY']   = get_local_week_of_year(time)[1] + 1;

       timeds['LOCAL']['TZONE'] = time.getTimezoneOffset()/60;

       timeds['UTC'] = {};
       timeds['UTC']['YYYY']  = '' + time.getUTCFullYear() + '';
       timeds['UTC']['MM'] = zp(Number(time.getUTCMonth() + 1), 2)
       // if(time.getUTCMonth() < 9) {
       //     timeds['UTC']['MM'] = '0' + (time.getUTCMonth() + 1) + '';
       // }else {
       //     timeds['UTC']['MM'] = '' + (time.getUTCMonth() + 1) + '';
       // }

       timeds['UTC']['DD'] = zp(time.getUTCDate(), 2)
       // if(time.getUTCDate() <= 9) {
       //     timeds['UTC']['DD'] = '0' + time.getUTCDate() + '';
       // }else {
       //     timeds['UTC']['DD'] = '' + time.getUTCDate() + '';
       // }

       timeds['UTC']['hh'] = zp(time.getUTCHours(), 2)
       // if(time.getUTCHours() <= 9) {
       //     timeds['UTC']['hh'] = '0' + time.getUTCHours() + '';
       // }else {
       //     timeds['UTC']['hh'] = '' + time.getUTCHours() + '';
       // }

       timeds['UTC']['mm'] = zp(time.getUTCMinutes(), 2)
       // if(time.getUTCMinutes() <= 9) {
       //     timeds['UTC']['mm'] = '0' + time.getUTCMinutes() + '';
       // }else {
       //     timeds['UTC']['mm'] = '' + time.getUTCMinutes() + '';
       // }

       timeds['UTC']['ss'] = zp(time.getUTCSeconds(), 2)
       // if(time.getUTCSeconds() <= 9) {
       //     timeds['UTC']['ss'] = '0' + time.getUTCSeconds() + '';
       // }else {
       //     timeds['UTC']['ss'] = '' + time.getUTCSeconds() + '';
       // }

       timeds['UTC']['ms'] = String(time.getUTCMilliseconds())

       timeds['UTC']['YYYY-MM-DD']   = timeds['UTC']['YYYY'] + '-' + timeds['UTC']['MM'] + '-' + timeds['UTC']['DD'];
       timeds['UTC']['hh:mm:ss']     = timeds['UTC']['hh']   + ':' + timeds['UTC']['mm'] + ':' + timeds['UTC']['ss'];
       timeds['UTC']['YYYY-MM-DD hh:mm:ss'] =  timeds['UTC']['YYYY-MM-DD'] + ' ' + timeds['UTC']['hh:mm:ss'];
       timeds['UTC']['ISO8601']      =  timeds['UTC']['YYYY-MM-DD'] + 'T' + timeds['UTC']['hh:mm:ss'] + 'Z'
       timeds['UTC']['ISO']          =  timeds['UTC']['YYYY-MM-DD'] + 'T' + timeds['UTC']['hh:mm:ss'] + 'Z'
       timeds['UTC']['TZONE']        = '0';

       timeds['UTC']['MONABBR']      = monmap[ Number(timeds['UTC']['MM']) ]
       timeds['UTC']['DOW']          = Number(time.getUTCDay() +1);
       timeds['UTC']['DOWABBR']      = dowmap[ timeds['UTC']['DOW'] ];
       timeds['UTC']['WOY']          = get_utc_week_of_year(time);

       // let firstdoy = new Date(time.getUTCFullYear(),0 ,0).getTime()
       // let diff = time.getTime() - firstdoy
       // timeds['UTC']['DOY']          = zp(Math.floor(diff / Number(1000 * 60 * 60 * 24)) + 1, 3)
       timeds['UTC']['DOY']          = get_utc_day_of_year(time)

       timeds['UTC']['EPOCH_MS']     = time.getTime();
       timeds['UTC']['EPOCH']        = timeds['UTC']['EPOCH_MS']/1000;

       timeds['UTC']['TIMESTAMP']    = Math.round(timeds['UTC']['EPOCH'])
       // timeds['UTC']['DOW']          = time.getUTCDay();
       //timeds['UTC']['WOY']   = get_week_of_year(Date(timeds['UTC']['TIMESTAMP']))[1];

       timeds['LOCAL']['TIMESTAMP']  = timeds['UTC']['TIMESTAMP'] - timeds['LOCAL']['TZONE'] * 3600

       return timeds;
 }

exports.tell_time = tell_time

function get_utc_day_of_year(d) {
  let firstdoy = new Date(d.getUTCFullYear(),0 ,0).getTime()
  let diff = d.getTime() - firstdoy

  return zp(Math.floor(diff / Number(1000 * 60 * 60 * 24)) + 1, 3)
}

exports.get_utc_day_of_year = get_utc_day_of_year


function get_utc_week_of_year(d) {
  let firstdoydow = Number(new Date(String(d.getUTCFullYear()) + '-01-01').getUTCDay() + 1)

  let doy = Number(get_utc_day_of_year(d))
  let dow = Number(d.getUTCDay() + 1)
  let woy = Math.round(Number(Number(doy + firstdoydow + 2) / 7) - 1)

  if (firstdoydow == 1) { woy++ }

  return zp(woy, 2)
}

exports.get_utc_week_of_year = get_utc_week_of_year


function get_local_week_of_year( d ) {
   https://stackoverflow.com/questions/6117814/get-week-of-year-in-javascript-like-in-php
   // Copy date so don't modify original
   d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
   // Set to nearest Thursday: current date + 4 - current day number
   // Make Sunday's day number 7
   d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
   // Get first day of year
   var yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
   // Calculate full weeks to nearest Thursday
   var weekNo = String(Math.ceil(( ( (d - yearStart) / 86400000) + 1)/7));
   // Return array of year and week number

   if (weekNo <= 9) {
     weekNo = '0' + weekNo
   }

   return [d.getUTCFullYear(), weekNo]
}
exports.get_local_week_of_year = get_local_week_of_year

function zp (integer, padding) { // Zero Pad

  let zpint = integer
  let zp = ''
  if (String(padding).match(RegExp('^[0-9]+$'))) {
    if (String(integer).match(RegExp('^[0-9]+$'))) {

      let intlen = String(integer).length
      let difflen = Number(padding - intlen)
      if (difflen > 0) {
        for (z = 0; z < difflen; z++) {
          zp += '0'
        }
      }

      return String(zp + zpint)
    } else {
      console.log('ERROR: Not an integer [' + integer + ']')
      // process.exit(1)
      return integer
    }
  } else {
    console.log('ERROR: Padding Not an positive integer [' + padding + ']')
    // process.exit(1)
    return integer
  }
}


function isValidDate(d) {
  let validate = false

  let validates = []

  let yyyy_mm_dd = ''
  let rxtest = false
  let tstype = ''
  let rxs = {
    // RegExp('^[0-9]{4}\-[0-9]{2}\-[0-9]{2}T[0-9]{2}\:[0-9]{2}\:[0-9]{2}\+[0-9]{2,4}$'),
    // RegExp('^[0-9]{4}\-[0-9]{2}\-[0-9]{2}T[0-9]{2}\:[0-9]{2}\:[0-9]{2}\+[0-9]{2}\:[0-9]{2}$'),

    // 2023-03-03 00:16:52.783599+00:00
    // "YYYY-MM-DD hh:mm:ss.ms+hh:mm": RegExp(''),
    // "YYYY-MM-DD hh:mm:ss.ms+hh:mm": RegExp('^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{6}\+\d{2}:\d{2}$'),
    // "YYYY-MM-DD hh:mm:ss.ms+hh:mm": RegExp('^[0-9]{4}\-[0-9]{2}\-[0-9]{2} [0-9]{2}\:[0-9]{2}\:[0-9]{2}\.[0-9]+\+[0-9]{2}\:[0-9]{2}$'),

    // "YYYY-MM-DD hh:mm:ss.ms+hh:mm": RegExp('^[0-9]{4}\-[0-9]{2}\-[0-9]{2}\s+[0-9]{2}\:[0-9]{2}\:[0-9]{2}\.[0-9]+\+[0-9]{2}\:[0-9]{2}$'),
    "YYYY-MM-DDThh:mm:ssZ": RegExp('^[0-9]{4}\-[0-9]{2}\-[0-9]{2}T[0-9]{2}\:[0-9]{2}\:[0-9]{2}Z$'),
    "YYYY-MM-DDThh:mm:ss": RegExp('^[0-9]{4}\-[0-9]{2}\-[0-9]{2}T[0-9]{2}\:[0-9]{2}\:[0-9]{2}$'),
    "YYYY-MM-DD hh:mm:ss": RegExp('^[0-9]{4}\-[0-9]{2}\-[0-9]{2}\s+[0-9]{2}\:[0-9]{2}\:[0-9]{2}$'),
    "YYYY-MM-DD": RegExp('^[0-9]{4}\-[0-9]{2}\-[0-9]{2}$'),
    "YYYYMMDD": RegExp('^[0-9]{4}[0-9]{2}[0-9]{2}$'),
    "M/D/Y": RegExp('^[0-9]{1,2}\/[0-9]{1,2}\/[0-9]{4}$'),
    // RegExp('^[A-Za-z]{3}\s+[A-Za-z]{3}\s+[0-9]{1,2}+\s+[0-9]{4}\s+[0-9]{2}\:[0-9]{2}\:[0-9]{2}'),
    // "EPOCH_MS": RegExp('^[0-9]+$'),
    "EPOCH": RegExp('^[0-9]+$')
  }


  for (r in rxs) {
    if (String(d).match(rxs[r])) {
      rxtest = true
      tstype = r
    }
  }

  if (rxtest) {
    if (mch = String(d).match(RegExp('^([0-9]{4})\-([0-9]{2})\-([0-9]{2})'))) {
      yyyy_mm_dd = mch[1] + '-' + mch[2] + '-' + mch[3]
    }

    // console.log("Test Date: " + yyyy_mm_dd)

    let time = new Date(d)
    let year = time.getUTCFullYear()
    let di   = 0


    let tmptime = new Date(String(year + '-01-01'))
    let startts = Number(tmptime.getTime()/1000)

    while ( tmptime.getUTCFullYear() == year ) {
      // console.log (di + ' ' + startts)
      let newts = Number(startts + (di * 3600 * 24))
      // console.log (di + ' ' + startts + ' ' + newts)
      tmptime = new Date(Number(newts * 1000))
      let ds = tmptime.getUTCFullYear() + '-' + zp(Number(tmptime.getUTCMonth() + 1), 2) + '-' + zp(tmptime.getUTCDate(), 2)
      // console.log (di + ' ' + ds)
      if ( tmptime.getUTCFullYear() == year ) {
        validates.push ( ds )
      }

      di++
    }
  }

  for (vd in validates) {
    if (validates[vd] == yyyy_mm_dd) {
      validate = true
    }
  }
  // console.log(JSON.stringify(validates, null, 2))

  return validate
}

exports.isValidDate = isValidDate
