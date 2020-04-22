function getData(data) {
    // data
    let inputLines = String(data.subjects).trim().replace(/[\r\ufffd]/g, '').split('\n')
    if (!inputLines) return
    let dataSubjects = []
    let keys = inputLines[0].split('\t').map(head => head.trim().toLowerCase())
    for (let line of inputLines.slice(1))
        dataSubjects.push(Object.fromEntries(line.split('\t')
            .map((val, index) => [keys[index], isNaN(val.trim()) ? val : (Number(val) || undefined)])))
    let ectsDiv = {2: [2], 3: [1, 2], 5: [2, 3], 6: [3, 3], 7: [2, 5]} // how to divide ectses
    let subjectsData = getSubjects(dataSubjects, data.semester, data.students)
    let ectsAvail = {}, periods = (data.periods[0] + data.periods[1])
    for (let [label, rooms] of Object.entries(data.rooms)) ectsAvail[label] = rooms.length * data.days.length * periods
    let ectsSpaces = ectsRequiredForDivisions(ectsDiv, data.periods)
    return {subjectsData, rooms: data.rooms, days: data.days, ectsDiv, ectsSpaces, ectsAvail}
}

function getSubjects(data, semester, students) {
    let subjects = {}
    for (let [batch, secData] of Object.entries(students)) {
        subjects[batch] = {subjects: [], sections: [], merge: []}
        let merging = [], mergedStuds = 0, overMerge = false
        for (let [sec, studs] of Object.entries(secData).sort((a, b) => a[1] < b[1] ? -1 : 1)) {
            if (!studs) continue
            subjects[batch].sections.push(sec)
            if (overMerge) continue
            if (mergedStuds + studs > 40) {
                if (merging.length > 1) subjects[batch].merge.push(merging)
                if (studs < 40) {
                    merging = [sec]
                    mergedStuds = studs
                } else overMerge = true // no mergeable sections anymore
            } else {
                merging.push(sec)
                mergedStuds += studs
            }
        }
        if (!overMerge && merging.length > 1) subjects[batch].merge.push(merging)
    }
    for (let row of data) {
        if (row.semester !== semester) continue
        let rowData = {elective: row.elective, code: row.code, title: row.title, ects: row.ects, label: row.label || 'general'}
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

function emptySchedule(data, days, rooms) {
    let byRoom = {}, bySection = {}, bySubject = {}
    for (let [label, list] of Object.entries(rooms)) {
        byRoom[label] = {}
        for (let room of list) {
            byRoom[label][room] = {}
            for (let day of days) {
                byRoom[label][room][day] = {morning: Array(5).fill(null), afternoon: Array(5).fill(null)}
            }
        }
    }
    for (let [batch, dataBat] of Object.entries(data)) {
        bySection[batch] = {}
        for (let section of dataBat.sections) {
            bySection[batch][section] = {}
            for (let day of days) {
                bySection[batch][section][day] = {morning: Array(5).fill(null), afternoon: Array(5).fill(null)}
            }
        }
        bySubject[batch] = {}
        for (let subject of dataBat.subjects) {
            let key = [subject.code, subject.title]
            bySubject[batch][key] = {}
            for (let day of days) {
                bySubject[batch][key][day] = {morning: Array(5).fill(null), afternoon: Array(5).fill(null)}
            }
        }
    }
    return {byRoom, bySection, bySubject}
}

function mergeConsecutive(inWhat) {
    // get nulls with their start indices
    // [11,11,11,null,null,11,null,null,null] => [[3, 2], [6, 3]]
    let lastI = 0, result = inWhat.map(sp => sp === null ? 1 : 0)
    for (let [i, sp] of result.slice(1).entries()) {
        if (result[lastI] && sp) {
            result[lastI] += sp
            result[i + 1] = 0
        } else lastI = i + 1
    }
    return result.reduce((sps, sp, i) => sp ? [...sps, [i, sp]] : sps, [])
}

function intersection(first, second, third) {
    // space intersection between the room, subject and section spaces
    let iStart = 0, intersec = 0
    for (let [i1, sp1] of first) {
        for (let [i2, sp2] of second) {
            for (let [i3, sp3] of third) {
                let begin = Math.max(i1, i2, i3)
                let inters = Math.min(i1 + sp1, i2 + sp2, i3 + sp3) - begin
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
    // let available = []
    for (let space of spaces) {
        let [day, halfDay] = space.slice(1, 3)
        let [iStart, intersec] = intersection(mergeConsecutive(space[3]),
                                              mergeConsecutive(sectionData[day][halfDay]),
                                              mergeConsecutive(subjectData[day][halfDay]))
        if (intersec < ectsSpace || assignedDays.includes(day)) continue  // not desired
        // available.push([...space, iStart])
        (intersec == ectsSpace ? exactSpaces : moreSpaces).push([...space, iStart])
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

function getSpaces(roomSch) {
    let spaces = {} // for choices
    for (let [label, schLabel] of Object.entries(roomSch)) {
        spaces[label] = []
        for (let [room, schRoom] of Object.entries(schLabel))
            for (let [day, schDay] of Object.entries(schRoom))
                for (let [half, schHalf] of Object.entries(schDay))
                    spaces[label].push([room, day, half, schHalf])
    }
    return spaces
}

function schedule(data, dry) {
    let spacesReq = {}
    let {byRoom, bySection, bySubject} = emptySchedule(data.subjectsData, data.days, data.rooms)
    let spaces = getSpaces(byRoom)
    for (let [batch, propsBatch] of Object.entries(data.subjectsData)) {
        let nSubjects = propsBatch.subjects.length
        if (!nSubjects) continue
        let colorIncrement = Math.round((256 ** 3 - 8000000) / nSubjects)
        let color = 5000000
        for (let subject of propsBatch.subjects) {
            if (subject.label == 'none') continue // is not taught in class room
            let colorSubj = Math.round(color).toString(16)
            color += colorIncrement
            let assignedSections = Object.fromEntries(propsBatch.subjects.map(sub => [sub.code, []])) // for merged
            for (let section of propsBatch.sections) {
                if (subject.elective && subject.elective !== section || assignedSections[subject.code].includes(section)) continue
                let [secName, secs] = ifMerged(section, propsBatch.merge, assignedSections[subject.code])
                let assignedDays = []
                for (let portion of data.ectsDiv[subject.ects]) {
                    if (dry) {spacesReq[subject.label] = (spacesReq[subject.label] || 0) + data.ectsSpaces[portion]; continue} // only to know required
                    let secData = bySection[batch][section], subjData = bySubject[batch][[subject.code, subject.title]]
                    let space = chooseSpace(spaces[subject.label], portion, secData, subjData, assignedDays)
                    if (!space) return // failed
                    let [room, day, halfDay, propsSpace, iStart] = space, iEnd = iStart + portion
                    let info = {subject, start: iStart, ects: portion, color: colorSubj}
                    // to sections
                    for (let sec of secs) {
                        let locSec = bySection[batch][sec][day]
                        locSec[halfDay][iStart] = {...info, room}
                        if (portion > 1) for (let i = iStart + 1; i < iEnd; i++) locSec[halfDay][i] = 1
                    }
                    // to subject and room
                    subjData[day][halfDay][iStart] = {start: iStart, room, section: secName, ects: portion}
                    propsSpace[iStart] = {batch, section: secName, ...info}
                    for (let i = iStart + 1; i < iEnd; i++) {
                        subjData[day][halfDay][i] = 1
                        propsSpace[i] = 1
                    }
                    assignedDays.push(day)
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
    let freedomFactor = days/(days - 1) // some safety factor
    let required = schedule(data, true)
    let spaceMessage = [[], []]
    for (let [label, req] of Object.entries(required)) {
        if (!data.ectsAvail.hasOwnProperty(label)) {
            return {success: false, message: `No room available for: ${label}`}
        }
        let withFactor = Math.round(req * freedomFactor)
        if (withFactor > data.ectsAvail[label])
            return {success: false, message: `Not enough space for label: ${label}, ${withFactor} > ${data.ectsAvail[label]}`}
        spaceMessage[0].push(`${label}: ${withFactor}`)
        spaceMessage[1].push(`${label}: ${data.ectsAvail[label]}`)
    }
    spaceMessage = `Required: (${spaceMessage[0].join(', ')}), Available: (${spaceMessage[1].join(', ')})`
    let trials = 500
    for (let trial = 0; trial < trials; trial++) {
        let sched = schedule(data)
        if (sched) return {success: true, ...sched, message: `Trial: ${trial} ${spaceMessage}`}
    }
    return {success: false, message: `Try again. ${spaceMessage}`}
}

// let data = {
//     rooms: ['311', '313', '310', '319', '320', '321', '338', '339', '1', '2'],
//     semester: 1,
//     // days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
//     days: ['mon', 'tue', 'wed', 'thu', 'fri'],
//     periods: [5, 5],
//     students: {
//         1: {1: 20, 2: 10},
//         2: {1: 12, 2: 23, 3: 78},
//         3: {1: 12},
//         4: {1: 23, 2: 23, 3: 34},
//         5: {'thermal': 23, 'industrial': 23, 'motor': 23, 'manufacturing': 23, 'design': 23, 'railway': 0}
//     },
//     subjects: require('fs').readFileSync('../public/subjects.txt').toString()
// }
// console.log(makeSchedule(data))

onmessage = event => {
    postMessage(makeSchedule(event.data))
}
