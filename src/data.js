let dataSubjects = {1: [], 2: []}

export async function init() {
    let content = await (await fetch('subjects.txt')).text()
    let inputLines = String(content).trim().replace(/[\r\ufffd]/g, '').split('\n')
    if (!inputLines) return
    let keys = inputLines[0].split('\t').map(head => head.trim().toLowerCase())
    let labels = [[], []], ectses = [[], []]
    for (let line of inputLines.slice(1)) {
        let row = Object.fromEntries(line.split('\t')
            .map((val, index) => [keys[index], isNaN(val.trim()) ? val.trim() : (Number(val) || undefined)]))
        let label = row.label || 'general'
        if (label == 'none') continue
        if (!labels[row.semester - 1].includes(label)) labels[row.semester - 1].push(label)
        dataSubjects[row.semester].push(row)
        if (!ectses[row.semester - 1].includes(row.ects)) ectses[row.semester - 1].push(row.ects)
    }
    return {labels, ectses}
}

export default function prepData(input) {
    let subjectsData = getBatchesData(input.semester, input.students, input.mergeBelow)
    let ectsAvail = {}, periods = input.periods[0] + input.periods[1]
    for (let [label, rooms] of Object.entries(input.rooms)) ectsAvail[label] = rooms.length * input.days.length * periods
    let ectsSpaces = ectsRequiredForDivisions(input.ectsDiv, input.periods)
    return {subjectsData, rooms: input.rooms, days: input.days, ectsDiv: input.ectsDiv, ectsSpaces, ectsAvail}
}

function getBatchesData(semester, students, mergeBelow) {
    let subjects = {}
    for (let [batch, secData] of Object.entries(students)) {
        subjects[batch] = {subjects: [], sections: [], merge: []}
        let merging = [], mergedStuds = 0, overMerge = false
        for (let [sec, studs] of Object.entries(secData).sort((a, b) => a[1] < b[1] ? -1 : 1)) {
            if (!studs) continue
            subjects[batch].sections.push(sec)
            if (overMerge) continue
            if (mergedStuds + studs > mergeBelow) {
                if (merging.length > 1) subjects[batch].merge.push(merging)
                if (studs < mergeBelow) {
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
    for (let row of dataSubjects[semester]) {
        let rowData = {elective: row.elective, code: row.code, title: row.title, ects: row.ects, label: row.label || 'general'}
        subjects[row.year].subjects.push(rowData)
    }
    for (let [batch, data] of Object.entries(subjects))  // remove empty batches
        if (!data.subjects.length || !data.sections.length) delete subjects[batch]
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
