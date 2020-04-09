function getData(data) {
    // data
    let semester = data.semester
    let periods = data.periods
    let days = data.days
    let rooms = data.rooms
    let sections = data.students
    let merge = {5: [['manufacturing', 'industrial'], ['motor', 'design']]}
    let inputLines = String(data.subjects).trim().replace(/[\r\ufffd]/g, '').split('\n')
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
    let ects_avail = (periods[0] + periods[1]) * rooms.length * days.length
    let ects_spaces = ectsRequiredForDivisions(ects_div, periods)
    return {subjects_data, rooms, days, ects_div, ects_spaces, merge, ects_avail}
}

function getSubjects(data, semester, sections) {
    let subjects = {}
    for (let [batch, sec] of Object.entries(sections)) {
        let secs = Object.entries(sec).filter(([_, studs]) => studs).map(([sec, _]) => sec)
        subjects[batch] = {subjects: [], sections: secs}
    }
    for (let row of data) {
        if (row.semester !== semester) continue
        let row_data = {elective: row.elective, code: row.code, title: row.title, ects: row.ects}
        subjects[row.year].subjects.push(row_data)
    }
    for (let [batch, data] of Object.entries(subjects)) {  // remove empty batches
        if (!data.subjects.length || !data.sections.length) {
            delete subjects[batch]
        }
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

function getSpaceCombos(rooms, days) {
    // room-time combinations
    let spaces = []
    for (let room of rooms) {
        for (let day of days) {
            spaces.push([[room, day, 'morning'], {assigned: [], empty: 5}])
            spaces.push([[room, day, 'afternoon'], {assigned: [], empty: 5}])
        }
    }
    return spaces
}

function emptySchedule(data, days, rooms) {
    let by_room = {}, by_section = {}, by_subject = {}
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
                by_section[batch][section][day] = {morning: [], afternoon: [], sp_morning: Array(5).fill(1), sp_afternoon: Array(5).fill(1)}
            }
        }
        by_subject[batch] = {}
        for (let subject of data_bat.subjects) {
            by_subject[batch][subject.code] = {}
            for (let day of days) {
                by_subject[batch][subject.code][day] = {morning: [], afternoon: []}
            }
        }
    }
    return {by_room, by_section, by_subject}
}

function chooseSpace(spaces, ects_space, sectionData, assigned_days) {
    let more_spaces = [], exact_spaces = []
    for (let [space, props_space] of spaces) {
        let empty = props_space.empty
        let [day, half_day] = space.slice(1)
        // find consecutive empty
        let sectionSpace = [...sectionData[day]['sp_' + half_day]], last = 0
        for (let [i, sp] of sectionSpace.slice(1).entries()) {
            if (sectionSpace[last] && sp) {
                sectionSpace[last] += sp
                sectionSpace[i + 1] = 0
            } else last = i + 1
        }
        // check both space and time
        let sectionEmpty = sectionSpace.filter((sp, i) => sp >= ects_space && i >= 5-empty).length
        if (empty < ects_space || !sectionEmpty || assigned_days.includes(day)) continue  // not desired
        if (empty == ects_space) {
            exact_spaces.push([space, props_space])
        } else {
            more_spaces.push([space, props_space])
        }
    }
    let available = exact_spaces.length ? exact_spaces : more_spaces
    if (!available.length) return
    return available[Math.floor(Math.random() * available.length)]
}

function ifMerged(section, sections, assigned) {
    let secName, secsMerged = [], secs
    for (let mrg of sections || []) {
        if (mrg.includes(section)) {
            secsMerged = mrg
            break
        }
    }
    if (secsMerged.includes(section)) {
        secsMerged.map(sec => assigned.push(sec))  // in place
        secName = secsMerged.join(' & ')
        secs = secsMerged
    } else {
        secName = section
        secs = [section]
    }
    return [secName, secs]
}

function schedule(data, dry) {
    let spaces_req = 0
    let spaces = getSpaceCombos(data.rooms, data.days)
    let {by_room, by_section, by_subject} = emptySchedule(data.subjects_data, data.days, data.rooms)
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
                let [secName, secs] = ifMerged(section, props_batch.merge, assignedSections[subject.code])
                let assigned_days = []
                for (let portion of data.ects_div[subject.ects]) {
                    let info = {subject, ects: portion, color: color_subj}
                    let ects_space = data.ects_spaces[portion]
                    if (dry) {spaces_req += ects_space; continue} // only to know required
                    let space = chooseSpace(spaces, ects_space, by_section[batch][section], assigned_days)
                    if (!space) return // failed
                    let [[room, day, half_day], props_space] = space
                    // insert into schedule
                    by_room[room][day][half_day].push({batch, section: secName, ...info})
                    for (let sec of secs) {
                        let loc_sec = by_section[batch][sec][day]
                        loc_sec[half_day].push({...info, room})
                        let sectionSpace = loc_sec['sp_' + half_day], iStart = 5 - props_space.empty, iEnd = iStart + ects_space
                        for (let i = iStart; i < iEnd; i++) sectionSpace[i] = 0
                    }
                    by_subject[batch][subject.code][day][half_day].push({...info, room, section: secName})
                    // mark occupied
                    assigned_days.push(day)
                    props_space.empty -= ects_space
                }
            }
        }
    }
    if (dry) return spaces_req
    return {by_room, by_section, by_section}
}

async function makeSchedule(data) {
    if (!data) return
    data = getData(data)
    let freedomFactor = 1.05
    let required = Math.round(schedule(data, true) * freedomFactor)
    if (required < data.ects_avail) {
        let trials = 1000
        for (let trial = 0; trial < trials; trial++) {
            let sched = schedule(data)
            if (sched) {
                return {success: true, schedule: sched, trial, required, available: data.ects_avail}
            }
        }
    }
    return {success: false, required, available: data.ects_avail}
}

// let data = {
//     rooms: ['311', '313', '310', '319', '320', '321', '338', '339'],
//     semester: 1,
//     days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].slice(0, 5),
//     periods: [5, 5],
//     students: {
//         1: {1: 20, 2: 10},
//         2: {1: 12, 2: 23, 3: 78},
//         3: {1: 12, 2: 23},
//         4: {1: 23, 2: 23, 3: 34},
//         5: {'thermal': 23, 'industrial': 23, 'motor': 23, 'manufacturing': 23, 'design': 23, 'railway': 0}
//     },
//     subjects: require('fs').readFileSync('../public/subjects.txt').toString()
// }
// makeSchedule(data)
// // console.log(makeSchedule(data))

// let cm = permutIndices(10)
// for (let c of cm) console.log(c)

export default makeSchedule

