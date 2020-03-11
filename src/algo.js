function getData(text) {
    // data
    let semester = 1
    let periods = [5, 5]
    let days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat']
    let rooms = ['311', '313', '310', '319', '320', '321', '338', '339']
    // let sections = [2, 3, 2, 3, ['thermal', 'industrial', 'design', 'motor', 'manufacturing']]  // for the streams
    let sections = [2, 3, 2, 3, ['thermal', 'industrial', 'design', 'motor', 'manufacturing', 'railway']]  // for the streams
    let merge = {5: [['manufacturing', 'industrial'], ['motor', 'design']]}
    let inputLines = String(text).trim().replace(/[\r�]/g, '').split('\n')
    if (!inputLines) return
    let data_subjects = []
    let keys = inputLines[0].split('\t')
    for (let line of inputLines.slice(1)) {
        data_subjects.push(Object.fromEntries(line
            .split('\t')
            .map((val, index) => [keys[index], isNaN(val.trim()) ? val : (Number(val) || undefined)])))
    }
    let ects_div = {2: [2], 3: [1, 2], 5: [2, 3], 6: [3, 3], 7: [2, 5]} // how to divide ectses
    let subjects_data = getSubjects(data_subjects, semester, sections)
    for (let [batch, pairs] of Object.entries(merge)) subjects_data[batch].merge = pairs
    // for (let [batch, pairs] of Object.entries(merge)) subjects_data[batch].merge = pairs.reduce((withProp, val) => [...withProp, {pair: val, assigned: false}], [])
    // validate
    let ects_avail = (periods[0] + periods[1]) * rooms.length * days.length
    let ects_spaces = ectsRequiredForDivisions(ects_div, periods)
    let ects_req = ectsRequired(subjects_data, ects_spaces, ects_div)
    if (ects_avail > ects_req) {
        console.log('ects required:', ects_req, ', ects available:', ects_avail)
    } else {
        throw Error(`Not enough space or time, ${ects_avail} < ${ects_req}`)
    }
    return {subjects_data, rooms, days, ects_div, ects_spaces, merge}
}

function getSubjects(data, semester, sections) {
    let subjects = {}
    for (let [index, sec] of sections.entries()) {
        let secs = isNaN(sec) ? sec : [...Array(sec).keys()]
        subjects[index + 1] = {subjects: [], sections: secs}
    }
    for (let row of data) {
        if (row.semester !== semester) continue
        let row_data = {elective: row.elective, code: row.code, title: row.title, ects: row.ects}
        subjects[row.year].subjects.push(row_data)
    }
    return subjects
}

// get ectses required when combined in half days =======================
function ectsRequiredForDivisions(ects_div, periods) {
    let ects_spaces = {}
    for (let combos of Object.values(ects_div)) {
        for (let ects of combos) {
            ects_spaces[ects] = ects  // after assigning, due to not being complementary
        }
    }
    let ectses = Object.keys(ects_spaces).map(Number)
    for (let ects of ectses) {
        let other_space = periods[0] - ects
        let lefts = ectses.filter(other => other_space >= other).map(other => other_space - other)
        if (lefts.length) {
            ects_spaces[ects] = Math.min(...lefts) + ects
        }
    }
    return ects_spaces
}

function ectsRequired(data, ects_spaces, ects_div) {
    // get the required space and time in ects
    let ects_req = 0
    for (let batch of Object.values(data)) {
        let sections = 0
        if (batch.merge === undefined) {
            sections = batch.sections.length
        } else { // consider merged sections
            let consideredSections = []
            for (let section of batch.sections) {
                if (consideredSections.includes(section)) {
                    continue
                }
                let merged
                for (let pair of batch.merge) {
                    if (pair.includes(section)) {
                        consideredSections = [...consideredSections, ...pair]
                        merged = true
                        sections++
                    }
                }
                if (!merged) sections++
            }
        }
        let electives_ects = 0
        for (let subj of batch.subjects) {
            // actual space in ects required after dividing
            let division = ects_div[subj.ects]
            if (!division) {
                console.log('No division for ', subj)
                continue
            }
            let ects_space = ects_div[subj.ects].map(ects => ects_spaces[ects]).reduce((sum, ects) => sum + ects)
            if (subj.elective) {  // for specific, count once
                electives_ects += ects_space
            } else {  // common, for all
                ects_req += sections * ects_space
            }
        }
        ects_req += electives_ects
    }
    return ects_req
}

function getSpaceCombos(rooms, days) {
    // room-time combinations
    let spaces = []
    for (let room of rooms) {
        for (let day of days) {
            spaces.push([[room, day, 'morning'], {assigned: [], empty: 5}])
            spaces.push([[room, day, 'afternoon'], {assigned: [], empty: 5}])
        }
    }
    return Object.fromEntries(spaces)
}

function emptySchedule(data, days, rooms) {
    let by_room = {}, by_section = {}
    for (let room of rooms) {
        by_room[room] = {}
        for (let day of days) {
            by_room[room][day] = {morning: [], afternoon: []}
        }
    }
    for (let [batch, data_bat] of Object.entries(data)) {
        by_section[batch] = {}
        for (let section of data_bat.sections) {
            by_section[batch][section] = {}
            for (let day of days) {
                by_section[batch][section][day] = {morning: [], afternoon: [], sp_morning: 5, sp_afternoon: 5}
            }
        }
    }
    return {by_room, by_section}
}

function makeSchedule(text) {
    let data = getData(text)
    if (!data) return
    let spaces = getSpaceCombos(data.rooms, data.days)
    let {by_room, by_section} = emptySchedule(data.subjects_data, data.days, data.rooms)

    for (let [batch, props_batch] of Object.entries(data.subjects_data)) {
        let n_subjects = props_batch.subjects.length
        if (!n_subjects) continue
        let color_increment = Math.round((256 ** 3 - 8000000) / n_subjects)
        let color = 5000000
        for (let subject of props_batch.subjects) {
            let color_subj = Math.round(color).toString(16)
            color += color_increment
            let assignedSections = Object.fromEntries(props_batch.subjects.map(sub => [sub.code, []]))
            for (let section of props_batch.sections) {
                if (subject.elective && subject.elective !== section || assignedSections[subject.code].includes(section)) continue
                let secName, secsMerged = [], secs
                for (let mrg of props_batch.merge || []) {
                    if (mrg.includes(section)) {
                        secsMerged = mrg
                        break
                    }
                }
                if (secsMerged.includes(section)) {
                    assignedSections[subject.code] = assignedSections[subject.code].concat(secsMerged)
                    secName = secsMerged.join(', ')
                    secs = secsMerged
                } else {
                    secName = section
                    secs = [section]
                }
                let assigned_days = []
                for (let portion of data.ects_div[subject.ects]) {
                    let info = {subject, ects: portion, color: color_subj}
                    let ects_space = data.ects_spaces[portion]
                    // with empty space exactly enough for this
                    let more_spaces = [], exact_spaces = []
                    for (let space of Object.keys(spaces)) {
                        let empty = spaces[space]['empty']
                        let [_, day, half_day] = space.split(',')
                        if (empty < ects_space || by_section[batch][section][day]['sp_' + half_day] < ects_space
                            || assigned_days.includes(day)) continue  // not desired
                        if (empty == ects_space) {
                            exact_spaces.push(space)
                        } else {
                            more_spaces.push(space)
                        }
                    }
                    let available = (exact_spaces.length ? exact_spaces : more_spaces)
                    let space = available[Math.floor(Math.random() * available.length)]
                    let [room, day, half_day] = space.split(',')
                    // insert into schedule
                    by_room[room][day][half_day].push({batch, section: secName, ...info})
                    for (let sec of secs) {
                        let loc_sec = by_section[batch][sec][day]
                        loc_sec[half_day].push({...info, room})
                        loc_sec['sp_' + half_day] -= ects_space
                    }
                    // mark occupied
                    assigned_days.push(day)
                    spaces[space].empty -= ects_space
                }
            }
        }
    }
    return {by_room, by_section}
}

// makeSchedule(require('fs').readFileSync('../public/subjects.txt').toString())
// console.log(JSON.stringify(makeSchedule(require('fs').readFileSync('../public/subjects.txt').toString()).by_section, null, 3))
export default makeSchedule

