document.addEventListener('DOMContentLoaded', function() {
    function updateClassSettings() {
        const numClasses = document.getElementById("numClasses").value;
        const classSettingsList = document.getElementById("classSettingsList");
        classSettingsList.innerHTML = "";

        if (!numClasses || numClasses < 1) {
            showErrorPopup("Number of classes must be at least 1");
            return;
        }

        for (let i = 1; i <= numClasses; i++) {
            const classEntry = document.createElement("div");
            classEntry.classList.add("class-entry");
            classEntry.innerHTML = `
                <h5>Class ${i}</h5>
                <div class="class-grid">
                    <div class="input-group">
                        <label>Tables per Row:</label>
                        <input type="number" class="tables-per-row" min="1" value="5" onchange="validateClassSettings(this)" />
                    </div>
                    <div class="input-group">
                        <label>Number of Rows:</label>
                        <input type="number" class="num-rows" min="1" value="5" onchange="validateClassSettings(this)" />
                    </div>
                </div>
            `;
            classSettingsList.appendChild(classEntry);
        }
    }

    function validateClassSettings(input) {
        const value = parseInt(input.value);
        if (isNaN(value) || value < 1) {
            showErrorPopup(`${input.previousElementSibling.textContent.trim()} must be at least 1`);
            input.value = 1;
        }
    }

    function processExcelFile() {
        const fileInput = document.getElementById("excelFile");
        const file = fileInput.files[0];

        if (!file) {
            alert("Please upload an Excel file.");
            return;
        }

        const reader = new FileReader();

        reader.onload = function (e) {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: "array" });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
            console.log("Parsed Excel Data:", jsonData);
            previewExcelData(jsonData);
        };

        reader.onerror = function (error) {
            console.error("Error reading file:", error);
            alert("Failed to read the Excel file. Please try again.");
        };

        reader.readAsArrayBuffer(file);
    }

    function previewExcelData(data) {
        const previewTableBody = document.getElementById("previewTableBody");
        previewTableBody.innerHTML = "";
        if (!data || data.length <= 1) {
            alert("The uploaded Excel file is empty or has no valid data.");
            return;
        }
        data.slice(1).forEach((row, index) => {
            const tr = document.createElement("tr");
            const rowHTML = row.map(cell => `<td>${cell || ""}</td>`).join("");
            tr.innerHTML = `<td>${index + 1}</td>${rowHTML}`;
            previewTableBody.appendChild(tr);
        });
        document.getElementById("excelPreview").style.display = "block";
    }

    function standardizeGender(genderDist, index) {
        switch(genderDist) {
            case "alternate":
                return (index % 2 === 0) ? "MALE" : "FEMALE";
            case "all-boys":
                return "MALE";
            case "all-girls":
                return "FEMALE";
            case "random":
            default:
                return Math.random() < 0.5 ? "MALE" : "FEMALE";
        }
    }

    function addSubject() {
        const subjectList = document.getElementById("subjectList");
        const entry = document.createElement("div");
        entry.classList.add("subject-entry");
        entry.innerHTML = `
            <div class="subject-inputs">
                <input type="text" placeholder="Subject Name" class="subject-name" required />
                <input type="number" placeholder="Students" class="subject-students" min="0" value="0" onchange="validateSubjectStudents(this)" />
            </div>
            <button type="button" class="remove-subject-btn" onclick="this.closest('.subject-entry').remove(); updateTotalStudents();">×</button>
        `;
        subjectList.appendChild(entry);
    }

    function validateSubjectStudents(input) {
        const value = parseInt(input.value);
        const totalStudents = parseInt(document.getElementById("totalStudents").value);
        const subjectStudents = Array.from(document.querySelectorAll('.subject-students'))
            .reduce((sum, input) => sum + (parseInt(input.value) || 0), 0);
        if (isNaN(value) || value < 0) {
            showErrorPopup("Number of students must be a positive number");
            input.value = 0;
            return;
        }
        if (totalStudents && subjectStudents > totalStudents) {
            showErrorPopup(`Total subject students (${subjectStudents}) exceeds total students (${totalStudents})`);
            input.value = 0;
        }
    }

    function removeSubject(btn) {
        const subjectList = document.getElementById("subjectList");
        const entries = subjectList.querySelectorAll('.subject-entry');
        if (entries.length > 1) {
            btn.closest('.subject-entry').remove();
            updateTotalStudents();
        } else {
            showErrorPopup("At least one subject is required");
        }
    }

    function updateTotalStudents() {
        const subjectStudents = Array.from(document.querySelectorAll('.subject-students'))
            .reduce((sum, input) => sum + (parseInt(input.value) || 0), 0);
        document.getElementById("totalStudents").value = subjectStudents;
        document.getElementById("totalStudentsCount").textContent = subjectStudents;
    }

    function generateStudentList() {
        console.log("generateStudentList called");
        const rollStart = document.getElementById("rollStart").value;
        const rollEnd = document.getElementById("rollEnd").value;
        const genderDist = document.getElementById("genderDistribution").value;
        const totalStudents = parseInt(document.getElementById("totalStudents").value);
        const subjectStudents = Array.from(document.querySelectorAll('.subject-students'))
            .reduce((sum, input) => sum + (parseInt(input.value) || 0), 0);
        if (subjectStudents !== totalStudents) {
            showErrorPopup(`Sum of subject students (${subjectStudents}) must equal total students (${totalStudents})`);
            return;
        }
        if (!rollStart || !rollEnd) {
            showErrorPopup("Please enter roll number range");
            return;
        }
        const start = parseInt(rollStart);
        const end = parseInt(rollEnd);
        if (isNaN(start) || isNaN(end)) {
            showErrorPopup("Roll numbers must be valid numbers");
            return;
        }
        if (start > end) {
            showErrorPopup("Start roll number should be less than end roll number");
            return;
        }
        const studentCount = end - start + 1;
        if (studentCount !== totalStudents) {
            showErrorPopup(`Roll number range count (${studentCount}) must equal total students (${totalStudents})`);
            return;
        }
        const previewTable = document.getElementById("previewTableBody");
        const excelPreview = document.getElementById("excelPreview");
        previewTable.innerHTML = "";
        let maleCount = 0, femaleCount = 0;
        for (let i = start; i <= end; i++) {
            let gender = standardizeGender(genderDist, i);
            if (gender === "MALE") maleCount++;
            else femaleCount++;
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${i - start + 1}</td>
                <td>${i}</td>
                <td>Student ${i}</td>
                <td>${gender}</td>
            `;
            previewTable.appendChild(row);
        }
        document.getElementById("totalStudentsCount").textContent = studentCount;
        document.getElementById("boysCount").textContent = maleCount;
        document.getElementById("girlsCount").textContent = femaleCount;
        excelPreview.style.display = "block";
    }

    function getAllClassSettings() {
        const classEntries = document.querySelectorAll('.class-entry');
        if (!classEntries || classEntries.length === 0) {
            throw new Error('No class settings found');
        }
        const settingsArr = [];
        for (let i = 0; i < classEntries.length; i++) {
            const entry = classEntries[i];
            const tablesPerRow = parseInt(entry.querySelector('.tables-per-row').value);
            const numRows = parseInt(entry.querySelector('.num-rows').value);
            if (!tablesPerRow || !numRows || tablesPerRow < 1 || numRows < 1) {
                throw new Error(`Invalid settings for Class ${i + 1}`);
            }
            settingsArr.push({ tablesPerRow, numRows });
        }
        return settingsArr;
    }

    function generateSeating() {
        try {
            const examHalls = document.getElementById('examHalls');
            examHalls.innerHTML = '';
            const numClasses = parseInt(document.getElementById('numClasses').value);
            const studentsPerTable = parseInt(document.getElementById('studentsPerTable').value);
            const teachersPerClass = parseInt(document.getElementById('teachersPerClass').value);
            const numCameras = parseInt(document.getElementById('numCameras').value);
            const seatingArrangement = document.getElementById('seatingArrangement').value;
            const disabledStudents = parseInt(document.getElementById('disabledStudents').value);
            const disabledExamType = document.getElementById('disabledExamType').value;
            const prioritySeating = document.getElementById('prioritySeating').value;
            const distributionType = document.getElementById('distributionType').value;
            const students = getStudentData();
            console.log('Students passed to generateSeating:', students);
            if (!students || students.length === 0) {
                showErrorPopup('Please upload student data or generate a student list first');
                return;
            }
            const totalStudents = parseInt(document.getElementById('totalStudents').value);
            if (students.length !== totalStudents) {
                showErrorPopup(`Number of students in the list (${students.length}) does not match total students (${totalStudents})`);
                return;
            }
            if (!validateInputs(numClasses, students.length, studentsPerTable)) {
                return;
            }
            let allClassSettings;
            try {
                allClassSettings = getAllClassSettings();
            } catch (err) {
                showErrorPopup(err.message);
                return;
            }
            if (allClassSettings.length !== numClasses) {
                showErrorPopup('Mismatch between number of classes and class settings.');
                return;
            }
            console.log(allClassSettings);
            const classSeats = allClassSettings.map(s => s.tablesPerRow * s.numRows * studentsPerTable);
            const totalSeats = classSeats.reduce((a, b) => a + b, 0);
            if (students.length > totalSeats) {
                showErrorPopup(`Not enough seats for all students. Total seats: ${totalSeats}, students: ${students.length}`);
                return;
            }
            let arrangedStudents = [...students];
            if (seatingArrangement === 'mixed') {
                arrangedStudents = shuffleWithSubjectDistribution(arrangedStudents);
            } else if (seatingArrangement === 'segregated') {
                arrangedStudents.sort((a, b) => {
                    if (a.gender === b.gender) {
                        return a.subject.localeCompare(b.subject);
                    }
                    return a.gender.localeCompare(b.gender);
                });
            }
            if (disabledStudents > 0) {
                const disabledIndices = [];
                for (let i = 0; i < disabledStudents && i < arrangedStudents.length; i++) {
                    arrangedStudents[i].isDisabled = true;
                    disabledIndices.push(i);
                }
                if (prioritySeating === 'front' || prioritySeating === 'both') {
                    const frontRowStudents = Math.min(disabledIndices.length, studentsPerTable);
                    for (let i = 0; i < frontRowStudents; i++) {
                        const temp = arrangedStudents[i];
                        arrangedStudents[i] = arrangedStudents[disabledIndices[i]];
                        arrangedStudents[disabledIndices[i]] = temp;
                    }
                }
            }
            let studentIndex = 0;
            for (let classNum = 1; classNum <= numClasses; classNum++) {
                const classSettings = allClassSettings[classNum - 1];
                const seatsInClass = classSeats[classNum - 1];
                const classStudents = arrangedStudents.slice(studentIndex, studentIndex + seatsInClass);
                console.log(`Class ${classNum} settings:`, classSettings);
                console.log(`Class ${classNum} students:`, classStudents);
                const classDiv = createClassElement(
                    classNum,
                    classSettings,
                    teachersPerClass,
                    numCameras,
                    classStudents,
                    studentsPerTable,
                    seatingArrangement,
                    disabledExamType,
                    distributionType
                );
                examHalls.appendChild(classDiv);
                studentIndex += seatsInClass;
            }
        } catch (error) {
            showErrorPopup('Error generating seating plan: ' + error.message);
            console.error('Seating plan error:', error);
        }
    }

    function shuffleWithSubjectDistribution(students) {
        const subjectGroups = {};
        students.forEach(student => {
            if (!subjectGroups[student.subject]) {
                subjectGroups[student.subject] = [];
            }
            subjectGroups[student.subject].push(student);
        });
        Object.keys(subjectGroups).forEach(subject => {
            subjectGroups[subject] = shuffleArray(subjectGroups[subject]);
        });
        const result = [];
        let currentIndex = 0;
        while (result.length < students.length) {
            Object.keys(subjectGroups).forEach(subject => {
                if (currentIndex < subjectGroups[subject].length) {
                    result.push(subjectGroups[subject][currentIndex]);
                }
            });
            currentIndex++;
        }
        return result;
    }

    function getStudentData() {
        const previewTable = document.getElementById('previewTableBody');
        if (!previewTable.children.length) return null;
        const subjects = Array.from(document.querySelectorAll('.subject-entry')).map(entry => ({
            name: entry.querySelector('.subject-name').value,
            count: parseInt(entry.querySelector('.subject-students').value) || 0
        })).filter(subject => subject.name && subject.count > 0);
        const students = [];
        let currentSubjectIndex = 0;
        let subjectStudentCount = 0;
        for (const row of previewTable.children) {
            const cells = row.children;
            const student = {
                rollNo: cells[1] ? cells[1].textContent : cells[0].textContent,
                name: cells[2] ? cells[2].textContent : `Student ${cells[1] ? cells[1].textContent : cells[0].textContent}`,
                gender: cells[3] ? cells[3].textContent.toLowerCase() : 'unknown',
            };
            if (subjects.length > 0) {
                student.subject = subjects[currentSubjectIndex].name;
                subjectStudentCount++;
                if (subjectStudentCount >= subjects[currentSubjectIndex].count) {
                    currentSubjectIndex = (currentSubjectIndex + 1) % subjects.length;
                    subjectStudentCount = 0;
                }
            } else {
                student.subject = 'Unassigned';
            }
            students.push(student);
        }
        return students;
    }

    function createClassElement(classNum, settings, teachersPerClass, numCameras, students, studentsPerTable, seatingArrangement, disabledExamType, seatingMode = "distributed") {
        const classDiv = document.createElement('div');
        classDiv.className = 'exam-hall';
        const totalSeats = settings.tablesPerRow * settings.numRows * studentsPerTable;
        classDiv.innerHTML = `
            <h3>Class ${classNum} (${students.length} students / ${totalSeats} seats)</h3>
            <div class="room" style="grid-template-columns: repeat(${settings.tablesPerRow}, 1fr);">
                ${generateTables(settings, students, studentsPerTable, seatingMode)}
            </div>
        `;
        for (let i = 0; i < teachersPerClass; i++) {
            const teacher = document.createElement('div');
            teacher.className = 'teacher';
            teacher.style.left = `${(i + 1) * (100 / (teachersPerClass + 1))}%`;
            teacher.style.top = '20px';
            classDiv.querySelector('.room').appendChild(teacher);
        }
        for (let i = 0; i < numCameras; i++) {
            const camera = document.createElement('div');
            camera.className = 'camera';
            camera.style.left = `${(i + 1) * (100 / (numCameras + 1))}%`;
            camera.style.bottom = '20px';
            classDiv.querySelector('.room').appendChild(camera);
        }
        return classDiv;
    }

    function generateTables(settings, students, studentsPerTable, distributionType = "distributed") {
        console.log('generateTables called with students:', students);
        let tablesHTML = '';
        const totalTables = settings.tablesPerRow * settings.numRows;
        const totalSeats = totalTables * studentsPerTable;
        students.sort((a, b) => parseInt(a.rollNo) - parseInt(b.rollNo));
        const seatingMap = new Array(totalSeats).fill(null);
        let currentIndex = 0;
        if (distributionType === "compact") {
            for (let i = 0; i < students.length; i++) {
                const student = students[i];
                let placed = false;
                while (!placed && currentIndex < totalSeats) {
                    const tableStart = Math.floor(currentIndex / studentsPerTable) * studentsPerTable;
                    const tableEnd = tableStart + studentsPerTable;
                    const tableStudents = seatingMap.slice(tableStart, tableEnd);
                    const hasSameSubject = tableStudents.some(s => s && s.subject === student.subject);
                    if (!hasSameSubject) {
                        seatingMap[currentIndex] = student;
                        currentIndex++;
                        placed = true;
                    } else {
                        currentIndex = tableEnd;
                    }
                }
                if (!placed) {
                    for (let j = 0; j < totalSeats; j++) {
                        if (!seatingMap[j]) {
                            seatingMap[j] = student;
                            break;
                        }
                    }
                }
            }
        } else {
            const tableIndices = Array.from({ length: totalTables }, (_, i) => i);
            shuffleArray(tableIndices);
            for (let i = 0; i < students.length; i++) {
                const student = students[i];
                let placed = false;
                for (const tableIndex of tableIndices) {
                    const tableStart = tableIndex * studentsPerTable;
                    const tableEnd = tableStart + studentsPerTable;
                    const tableStudents = seatingMap.slice(tableStart, tableEnd);
                    const hasSameSubject = tableStudents.some(s => s && s.subject === student.subject);
                    if (!hasSameSubject) {
                        for (let j = tableStart; j < tableEnd; j++) {
                            if (!seatingMap[j]) {
                                seatingMap[j] = student;
                                placed = true;
                                break;
                            }
                        }
                    }
                    if (placed) break;
                }
                if (!placed) {
                    for (let j = 0; j < totalSeats; j++) {
                        if (!seatingMap[j]) {
                            seatingMap[j] = student;
                            break;
                        }
                    }
                }
            }
        }
        for (let row = 0; row < settings.numRows; row++) {
            for (let col = 0; col < settings.tablesPerRow; col++) {
                const tableStart = (row * settings.tablesPerRow + col) * studentsPerTable;
                const tableStudents = seatingMap.slice(tableStart, tableStart + studentsPerTable);
                tablesHTML += `
                    <div class="table" style="--seats-per-table: ${studentsPerTable}">
                        ${generateSeats(tableStudents, studentsPerTable)}
                    </div>
                `;
            }
        }
        return tablesHTML;
    }

    function generateSeats(tableStudents, maxSeats) {
        let seatsHTML = '';
        for (let i = 0; i < maxSeats; i++) {
            const student = tableStudents[i];
            if (student) {
                const gender = student.gender ? student.gender.toLowerCase() : '';
                const isDisabled = student.isDisabled ? ' disabled' : '';
                const subjectColor = getUniqueColor(student.subject || "Unassigned");
                seatsHTML += `
                    <div class="seat ${gender} ${isDisabled}"
                         title="${student.name} (${student.rollNo}) - ${student.subject}"
                         style="background-color: ${subjectColor}; color: #fff;">
                        <span class="roll-no">${student.rollNo}</span>
                    </div>
                `;
            } else {
                seatsHTML += '<div class="seat empty" title="Empty Seat"></div>';
            }
        }
        return seatsHTML;
    }

    function printSeatingPlan() {
        window.print();
    }

    function closeErrorPopup() {
        document.querySelector(".popup-overlay").style.display = "none";
    }

    function validateInputs(numClasses, totalStudents, studentsPerTable) {
        if (isNaN(numClasses) || numClasses < 1) {
            showErrorPopup('Number of classes must be at least 1');
            return false;
        }
        if (isNaN(totalStudents) || totalStudents < 1) {
            showErrorPopup('Total students must be at least 1');
            return false;
        }
        if (isNaN(studentsPerTable) || studentsPerTable < 1 || studentsPerTable > 4) {
            showErrorPopup('Students per table must be between 1 and 4');
            return false;
        }
        return true;
    }

    function showErrorPopup(message) {
        const popup = document.querySelector(".popup-overlay");
        const errorMessage = document.getElementById("error-message");
        errorMessage.textContent = message;
        popup.style.display = "flex";
    }

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    const subjectColorMap = new Map();

    function getUniqueColor(subject) {
        if (!subjectColorMap.has(subject)) {
            const colors = [
                '#e57373', '#64b5f6', '#81c784', '#ffd54f', '#ba68c8', '#4db6ac', '#ffb74d', '#a1887f', '#90a4ae', '#f06292',
                '#9575cd', '#4fc3f7', '#aed581', '#fff176', '#7986cb', '#ff8a65', '#dce775', '#b0bec5', '#f44336', '#2196f3'
            ];
            const color = colors[subjectColorMap.size % colors.length];
            subjectColorMap.set(subject, color);
        }
        return subjectColorMap.get(subject);
    }

    function generateSubjectLegend() {
        const legendContainer = document.getElementById("subjectLegend");
        legendContainer.innerHTML = "";
        subjectColorMap.forEach((color, subject) => {
            const legendItem = document.createElement("div");
            legendItem.className = "legend-item";
            legendItem.innerHTML = `
                <span class="legend-color" style="background-color: ${color};"></span>
                <span class="legend-text">${subject}</span>
            `;
            legendContainer.appendChild(legendItem);
        });
    }

    document.getElementById('generateStudentListBtn').addEventListener('click', generateStudentList);
    window.addSubject = addSubject;
    window.removeSubject = removeSubject;
    window.updateTotalStudents = updateTotalStudents;
    window.validateSubjectStudents = validateSubjectStudents;
    const popupCloseBtn = document.querySelector('.popup-close');
    if (popupCloseBtn) {
        popupCloseBtn.addEventListener('click', closeErrorPopup);
    }
    const popupOkBtn = document.querySelector('.popup-content .error-popup button[type="button"]');
    if (popupOkBtn) {
        popupOkBtn.addEventListener('click', closeErrorPopup);
    }
    document.getElementById("numClasses").addEventListener("input", updateClassSettings);
});

