# -{cd .. | python -m server}
from openpyxl import load_workbook
from random import choice


dataSubjects = None


def extract_subjects():
    '''extract subjects data from the excel file'''
    sheet = load_workbook('public/subjects.xlsx').active
    init_data = {'labels': [[], []], 'ectses': [[], []], 'streams': [{}, {}]}
    global dataSubjects
    dataSubjects = {1: [], 2: []}
    rows = sheet.rows
    keys = [cell.value.strip().lower() for [col, cell] in enumerate(next(rows)) if col < 8]
    for row in rows:
        row_data = {}
        for col, cell in enumerate(row):
            if col > 7:
                break
            value = cell.value.strip() if isinstance(cell.value, str) else cell.value
            if type(cell.value) == str:
                value = cell.value.strip()
                if value.isdigit():
                    value = int(value)
            else:
                value = cell.value
            row_data[keys[col]] = value
        if row_data['year'] is None:
            break
        label = row_data['label'] if row_data['label'] else 'general'
        if label == 'none':
            continue
        row_data['label'] = label
        # labels for form input
        labels = init_data['labels'][row_data['semester'] - 1]
        if label not in labels:
            labels.append(label)
        # ectses for form input
        ectses = init_data['ectses'][row_data['semester'] - 1]
        if row_data['ects'] not in ectses:
            ectses.append(row_data['ects'])
        # streams for form input
        streams = init_data['streams'][row_data['semester'] - 1]
        if row_data['year'] not in streams:
            streams[row_data['year']] = []
        if row_data['elective'] and row_data['elective'] not in streams[row_data['year']]:
            streams[row_data['year']].append(row_data['elective'])
        # record the data
        dataSubjects[row_data['semester']].append(row_data)
    return init_data


def getBatchesData(semester, students, mergeBelow):
    subjects = {}
    for batch, secData in students.items():
        batch = int(batch)
        subjects[batch] = {'subjects': [], 'sections': [], 'merge': []}
        merging = []
        mergedStuds = 0
        overMerge = False
        for sec, studs in sorted(secData.items(), key=lambda item: item[0]):
            if not studs:
                continue
            subjects[batch]['sections'].append(sec)
            if overMerge:
                continue
            if mergedStuds + studs > mergeBelow:
                if len(merging) > 1:
                    subjects[batch]['merge'].append(merging)
                if studs < mergeBelow:
                    merging = [sec]
                    mergedStuds = studs
                else:
                    overMerge = True  # no mergeable sections anymore
            else:
                merging.append(sec)
                mergedStuds += studs
        if not overMerge and len(merging) > 1:
            subjects[batch]['merge'].append(merging)
    for row in dataSubjects[semester]:
        rowData = {'elective': row['elective'], 'code': row['code'], 'title': row['title'], 'ects': row['ects'], 'label': row['label'], 'teacher': row['teacher']}
        subjects[row['year']]['subjects'].append(rowData)
    for batch, data in {**subjects}.items():  # remove empty batches
        if not data['subjects'] or not data['sections']:
            del subjects[batch]
    return subjects


def ectsRequiredForDivisions(ectsDiv, periods):
    ectsSpaces = {}
    for combos in ectsDiv.values():
        for ects in combos:
            ectsSpaces[ects] = ects  # after assigning, due to not being complementary
    ectses = [int(ects) for ects in ectsSpaces.keys()]
    for ects in ectses:
        otherSpace = periods[0] - ects
        lefts = [otherSpace - other for other in ectses if otherSpace >= other]
        if lefts:
            ectsSpaces[ects] = min(lefts) + ects
    return ectsSpaces


# =================ALGO===============================


def emptySchedule(data, days, rooms):
    byRoom = {}
    bySection = {}
    bySubject = {}
    for label, list in rooms.items():
        byRoom[label] = {}
        for room in list:
            byRoom[label][room] = {}
            for day in days:
                byRoom[label][room][day] = {'morning': [None] * 5, 'afternoon': [None] * 5}
    for batch, dataBat in data.items():
        bySection[batch] = {}
        for section in dataBat['sections']:
            bySection[batch][section] = {}
            for day in days:
                bySection[batch][section][day] = {'morning': [None] * 5, 'afternoon': [None] * 5}
        bySubject[batch] = {}
        for subject in dataBat['subjects']:
            key = subject['code'] + ',' + subject['title']
            bySubject[batch][key] = {}
            for day in days:
                bySubject[batch][key][day] = {'morning': [None] * 5, 'afternoon': [None] * 5}
    return byRoom, bySection, bySubject


def mergeConsecutive(inWhat):
    # get nulls with their start indices
    # [11,11,11,null,null,11,null,null,null] => [[3, 2], [6, 3]]
    lastI = 0
    result = [1 if sp is None else 0 for sp in inWhat]
    for i, sp in enumerate(result[1:]):
        if result[lastI] and sp:
            result[lastI] += sp
            result[i + 1] = 0
        else:
            lastI = i + 1
    return [[i, sp] for i, sp in enumerate(result) if sp]


def intersection(first, second, third):
    # space intersection between the room, subject and section spaces
    iStart = 0
    intersec = 0
    for i1, sp1 in first:
        for i2, sp2 in second:
            for i3, sp3 in third:
                begin = max((i1, i2, i3))
                inters = min((i1 + sp1, i2 + sp2, i3 + sp3)) - begin
                if inters > intersec:
                    intersec = inters
                    iStart = begin
    return iStart, intersec


def chooseSpace(spaces, ectsSpace, sectionData, subjectData, assignedDays):
    moreSpaces = []
    exactSpaces = []
    # available = []
    for space in spaces:
        day, halfDay = space[1:3]
        iStart, intersec = intersection(mergeConsecutive(space[3]),
                                        mergeConsecutive(sectionData[day][halfDay]),
                                        mergeConsecutive(subjectData[day][halfDay]))
        if intersec < ectsSpace or day in assignedDays:
            continue  # not desired
        # available.push([...space, iStart])
        if halfDay == 'morning':
            iStart += intersec - ectsSpace
        (exactSpaces if intersec == ectsSpace else moreSpaces).append([*space, iStart])
    available = exactSpaces if exactSpaces else moreSpaces
    if not available:
        return
    return choice(available)


def ifMerged(section, sections, assigned):
    secName = None
    secsMerged = []
    secs = None
    for mrg in sections:
        if section in mrg:
            secsMerged = mrg
            break
    if section in secsMerged:
        for sec in secsMerged:
            assigned.append(sec)  # in place
        secName = ' & '.join([str(sec) for sec in secsMerged])
        secs = secsMerged
    else:
        secName = section
        secs = [section]
    return [secName, secs]


def getSpaces(roomSch):
    spaces = {}  # for choices
    for label, schLabel in roomSch.items():
        spaces[label] = []
        for room, schRoom in schLabel.items():
            for day, schDay in schRoom.items():
                for half, schHalf in schDay.items():
                    spaces[label].append([room, day, half, schHalf])
    return spaces


def schedule(data, dry=False):
    spacesReq = {}
    byRoom, bySection, bySubject = emptySchedule(data['subjectsData'], data['days'], data['rooms'])
    spaces = getSpaces(byRoom)
    for batch, propsBatch in data['subjectsData'].items():
        nSubjects = len(propsBatch['subjects'])
        if not nSubjects:
            continue
        colorIncrement = round((256 ** 3 - 8000000) / nSubjects)
        color = 5000000
        for subject in propsBatch['subjects']:
            colorSubj = hex(round(color))[2:]
            color += colorIncrement
            assignedSections = dict([(sub['code'], []) for sub in propsBatch['subjects']])  # for merged
            for section in propsBatch['sections']:
                if subject['elective'] and subject['elective'] != section or section in assignedSections[subject['code']]:
                    continue
                secName, secs = ifMerged(section, propsBatch['merge'], assignedSections[subject['code']])
                assignedDays = []
                for portion in data['ectsDiv'][subject['ects']]:
                    if dry:
                        space_req = spacesReq.get(subject['label'], 0)
                        spacesReq[subject['label']] = space_req + data['ectsSpaces'][portion]
                        continue  # only to know required
                    secData = bySection[batch][section]
                    subjData = bySubject[batch][subject['code'] + ',' + subject['title']]
                    space = chooseSpace(spaces[subject['label']], portion, secData, subjData, assignedDays)
                    if not space:
                        return  # failed
                    room, day, halfDay, propsSpace, iStart = space
                    iEnd = iStart + portion
                    info = {'subject': subject, 'start': iStart, 'ects': portion, 'color': colorSubj}
                    # to sections
                    for sec in secs:
                        if subject['elective'] and subject['elective'] != sec:
                            continue  # maybe merged but not for elective
                        locSec = bySection[batch][sec][day]
                        locSec[halfDay][iStart] = {**info, 'room': room}
                        if portion > 1:
                            for i in range(iStart + 1, iEnd):
                                locSec[halfDay][i] = 1
                    # to subject and room
                    subjData[day][halfDay][iStart] = {'start': iStart, 'room': room, 'section': secName, 'ects': portion}
                    propsSpace[iStart] = {'batch': batch, 'section': secName, **info}
                    for i in range(iStart + 1, iEnd):
                        subjData[day][halfDay][i] = 1
                        propsSpace[i] = 1
                    assignedDays.append(day)
    if dry:
        return spacesReq
    return byRoom, bySection, bySubject


def makeSchedule(data):
    subjectsData = getBatchesData(data['semester'], data['students'], data['mergeBelow'])
    ectsAvail = {}
    periods = data['periods'][0] + data['periods'][1]
    for label, rooms in data['rooms'].items():
        ectsAvail[label] = len(rooms) * len(data['days']) * periods
    ectsSpaces = ectsRequiredForDivisions(data['ectsDiv'], data['periods'])
    prepped = {'subjectsData': subjectsData,
               'rooms': data['rooms'],
               'days': data['days'],
               'ectsDiv': {int(ects): div for ects, div in data['ectsDiv'].items()},
               'ectsSpaces': ectsSpaces}
    print(data['ectsDiv'])
    required = schedule(prepped, True)
    freedomFactor = 1.05
    spaceMessage = ['(Required)', '(Available)']
    for label, req in required.items():
        if label not in ectsAvail:
            return {'success': False, 'message': f'No room available for: {label}'}
        withFactor = round(req * freedomFactor)
        if req > ectsAvail[label]:
            return {'success': False, 'message': f'Not enough space for {label}, {withFactor} > {ectsAvail[label]}'}
        spaceMessage[0] += '\t' + f'{label}: {withFactor}'
        spaceMessage[1] += '\t' + f'{label}: {ectsAvail[label]}'
    spaceMessage = '\n'.join(spaceMessage)
    trials = 500
    for trial in range(trials):
        sched = schedule(prepped)
        if sched:
            return {'success': True, 'byRoom': sched[0], 'bySection': sched[1], 'bySubject': sched[2], 'message': f'Trial: {trial}\n{spaceMessage}'}
    return {'success': False, 'message': f'Try again.\n{spaceMessage}'}


# data = {
#     'rooms': {'general': ['311', '313', '310', '319', '338', '339', 'nb011'],
#               'drawing': ['320', '321'],
#               'workshop': ['Workshop'],
#               'computer': ['Lab 6']},
#     'semester': 1,
#     'year': 2020,
#     # days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
#     'days': ['mon', 'tue', 'wed', 'thu', 'fri'],
#     'periods': [5, 5],
#     'students': {
#         1: {1: 20, 2: 10},
#         2: {1: 12, 2: 23, 3: 78},
#         3: {1: 12},
#         4: {1: 23, 2: 23, 3: 34},
#         5: {'thermal': 23, 'industrial': 23, 'motor': 23, 'manufacturing': 23, 'design': 23, 'railway': 0}
#     },
#     'mergeBelow': 70,
#     'ectsDiv': {2: [2], 3: [1, 2], 5: [2, 3], 6: [3, 3], 7: [2, 5]}  # how to divide ectses
# }
# extract_subjects()
# from json import dumps
# print(dumps(makeSchedule(data), indent=4))
