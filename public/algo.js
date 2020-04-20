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
    let dataSubjects = []
    let keys = inputLines[0].split('\t')
    for (let line of inputLines.slice(1)) {
        dataSubjects.push(Object.fromEntries(line
            .split('\t')
            .map((val, index) => [keys[index], isNaN(val.trim()) ? val : (Number(val) || undefined)])))
    }
    let ectsDiv = {2: [2], 3: [1, 2], 5: [2, 3], 6: [3, 3], 7: [2, 5]} // how to divide ectses
    let subjectsData = getSubjects(dataSubjects, semester, sections)
    for (let [batch, pairs] of Object.entries(merge)) subjectsData[batch].merge = pairs
    let ectsAvail = (periods[0] + periods[1]) * rooms.length * days.length
    let ectsSpaces = ectsRequiredForDivisions(ectsDiv, periods)
    return {subjectsData, rooms, days, ectsDiv, ectsSpaces, merge, ectsAvail}
}

function getSubjects(data, semester, sections) {
    let subjects = {}
    for (let [batch, sec] of Object.entries(sections)) {
        let secs = Object.entries(sec).filter(([_, studs]) => studs).map(([sec, _]) => sec)
        subjects[batch] = {subjects: [], sections: secs}
    }
    for (let row of data) {
        if (row.semester !== semester) continue
        let rowData = {elective: row.elective, code: row.code, title: row.title, ects: row.ects}
        subjects[row.year].subjects.push(rowData)
    }
    for (let [batch, data] of Object.entries(subjects)) {  // remove empty batches
        if (!data.subjects.length || !data.sections.length) {
            delete subjects[batch]
        }
    }
    return subjects
}

// get ectses required when combined in half days =======================
function ectsRequiredForDivisions(ectsDiv, periods) {
    let ectsSpaces = {}
    for (let combos of Object.values(ectsDiv)) {
        for (let ects of combos) {
            ectsSpaces[ects] = ects  // after assigning, due to not being complementary
        }
    }
    let ectses = Object.keys(ectsSpaces).map(Number)
    for (let ects of ectses) {
        let otherSpace = periods[0] - ects
        let lefts = ectses.filter(other => otherSpace >= other).map(other => otherSpace - other)
        if (lefts.length) {
            ectsSpaces[ects] = Math.min(...lefts) + ects
        }
    }
    return ectsSpaces
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
    let byRoom = {}, bySection = {}, bySubject = {}
    for (let room of rooms) {
        byRoom[room] = {}
        for (let day of days) {
            byRoom[room][day] = {morning: [], afternoon: []}
        }
    }
    for (let [batch, dataBat] of Object.entries(data)) {
        bySection[batch] = {}
        for (let section of dataBat.sections) {
            bySection[batch][section] = {}
            for (let day of days) {
                bySection[batch][section][day] = {morning: [], afternoon: [], sp_morning: Array(5).fill(1), sp_afternoon: Array(5).fill(1)}
            }
        }
        bySubject[batch] = {}
        for (let subject of dataBat.subjects) {
            let key = [subject.code, subject.title]
            bySubject[batch][key] = {}
            for (let day of days) {
                bySubject[batch][key][day] = {morning: [], afternoon: [], sp_morning: Array(5).fill(1), sp_afternoon: Array(5).fill(1)}
            }
        }
    }
    return {byRoom, bySection, bySubject}
}

function mergeConsecutive(inWhat) {
    // [0,0,0,1,1,0,1,1,1] => [[3, 2], [6, 3]]
    let lastI = 0, result = inWhat.slice()
    for (let [i, sp] of result.slice(1).entries()) {
        if (result[lastI] && sp) {
            result[lastI] += sp
            result[i + 1] = 0
        } else lastI = i + 1
    }
    return result.reduce((sps, sp, i) => [...sps, [i, sp]], [])
}

function intersection(first, second, third) {
    // space intersection between the room, subject and section spaces
    let iStart = 0, intersec = 0
    for (let [i1, sp1] of first) {
        for (let [i2, sp2] of second) {
            for (let [i3, sp3] of third) {
                let begin1 = i1 > i2 ? i1 : i2
                let begin = begin1 > i3 ? begin1 : i3
                let end1 = i1 + sp1, end2 = i2 + sp2, end3 = i3 + sp3
                let endP = end1 < end2 ? end1 : end2
                let end = endP < end3 ? endP : end3
                let inters = end - begin
                if (inters > intersec) {
                    intersec = inters
                    iStart = begin
                }
            }
        }
    }
    return [iStart, intersec]
}

function chooseSpace(spaces, ectsSpace, sectionData, subjectData, assignedDays) {
    let moreSpaces = [], exactSpaces = []
    for (let [space, propsSpace] of spaces) {
        let empty = propsSpace.empty, iEmpty = 5 - empty
        let [day, halfDay] = space.slice(1)
        let [iStart, intersec] = intersection([[iEmpty, empty]],
                                              mergeConsecutive(sectionData[day]['sp_' + halfDay]),
                                              mergeConsecutive(subjectData[day]['sp_' + halfDay]))
        if (intersec < ectsSpace || assignedDays.includes(day)) continue  // not desired
        (intersec == ectsSpace ? exactSpaces : moreSpaces).push([space, propsSpace, iStart])
    }
    let available = exactSpaces.length ? exactSpaces : moreSpaces
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
    let spacesReq = 0
    let spaces = getSpaceCombos(data.rooms, data.days)
    let {byRoom, bySection, bySubject} = emptySchedule(data.subjectsData, data.days, data.rooms)
    for (let [batch, propsBatch] of Object.entries(data.subjectsData)) {
        let nSubjects = propsBatch.subjects.length
        if (!nSubjects) continue
        let colorIncrement = Math.round((256 ** 3 - 8000000) / nSubjects)
        let color = 5000000
        for (let subject of propsBatch.subjects) {
            let colorSubj = Math.round(color).toString(16)
            color += colorIncrement
            let assignedSections = Object.fromEntries(propsBatch.subjects.map(sub => [sub.code, []])) // for merged
            for (let section of propsBatch.sections) {
                if (subject.elective && subject.elective !== section || assignedSections[subject.code].includes(section)) continue
                let [secName, secs] = ifMerged(section, propsBatch.merge, assignedSections[subject.code])
                let assignedDays = []
                for (let portion of data.ectsDiv[subject.ects]) {
                    let info = {subject, ects: portion, color: colorSubj}
                    let ectsSpace = data.ectsSpaces[portion]
                    if (dry) {spacesReq += ectsSpace; continue} // only to know required
                    let secData = bySection[batch][section], subjData = bySubject[batch][[subject.code, subject.title]]
                    let space = chooseSpace(spaces, ectsSpace, secData, subjData, assignedDays)
                    if (!space) return // failed
                    let [[room, day, halfDay], propsSpace, iStart] = space, iEnd = iStart + ectsSpace
                    // to sections
                    for (let sec of secs) {
                        let locSec = bySection[batch][sec][day]
                        locSec[halfDay].push({...info, room})
                        let sectionSpace = locSec['sp_' + halfDay]
                        for (let i = iStart; i < iEnd; i++) sectionSpace[i] = 0
                    }
                    assignedDays.push(day)
                    // to subject
                    subjData[day][halfDay].push({room, section: secName, ects: portion})
                    let subjectSpace = subjData[day]['sp_' + halfDay]
                    for (let i = iStart; i < iEnd; i++) subjectSpace[i] = 0
                    // to rooms
                    byRoom[room][day][halfDay].push({batch, section: secName, ...info})
                    propsSpace.empty -= ectsSpace
                }
            }
        }
    }
    if (dry) return spacesReq
    return {byRoom, bySection, bySubject}
}

function makeSchedule(data) {
    if (!data) return
    data = getData(data)
    let days = data.days.length
    let freedomFactor = (days/(days - 1)) * 1.1 // some safety factor
    let required = Math.round(schedule(data, true) * freedomFactor)
    if (required < data.ectsAvail) {
        let trials = 1000
        for (let trial = 0; trial < trials; trial++) {
            let sched = schedule(data)
            if (sched) {
                return {success: true, ...sched, trial, required, treq: schedule(data, true), available: data.ectsAvail}
            }
        }
    }
    return {success: false, required, available: data.ectsAvail}
}

// let data = {
//     rooms: ['311', '313', '310', '319', '320', '321', '338', '339', '1'],
//     semester: 1,
//     // days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
//     days: ['mon', 'tue', 'wed', 'thu', 'fri'],
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
// console.log(makeSchedule(data))

onmessage = event => {
    let data = getData(event.data)
    postMessage({progress: true, required: schedule(data, true), available: data.ectsAvail})
    postMessage(makeSchedule(event.data))
}
