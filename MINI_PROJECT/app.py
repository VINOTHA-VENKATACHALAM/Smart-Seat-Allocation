from flask import Flask, render_template, request, jsonify
import random
from dataclasses import dataclass
from typing import List, Optional
import pandas as pd
import io

app = Flask(__name__)

@dataclass
class Student:
    id: str
    name: str
    gender: str
    subject: str
    is_disabled: bool = False

@dataclass
class Subject:
    name: str
    student_count: int

class SeatingGenerator:
    def __init__(self):
        self.students = []
        self.subjects = []

    def add_subject(self, name: str, student_count: int):
        self.subjects.append(Subject(name, student_count))

    def remove_subject(self, name: str):
        self.subjects = [s for s in self.subjects if s.name != name]

    def generate_students_from_excel(self, file_content: bytes) -> List[Student]:
        try:
            df = pd.read_excel(io.BytesIO(file_content))
            required_columns = ['Name', 'RollNo', 'Gender']
            
            if not all(col in df.columns for col in required_columns):
                raise ValueError("Excel file must contain Name, RollNo, and Gender columns")

            students = []
            for _, row in df.iterrows():
                student = Student(
                    id=str(row['RollNo']),
                    name=row['Name'],
                    gender=row['Gender'].lower(),
                    subject=random.choice([s.name for s in self.subjects]) if self.subjects else "Unassigned",
                    is_disabled=False
                )
                students.append(student)
            
            self.students = students
            return students
        except Exception as e:
            raise ValueError(f"Error processing Excel file: {str(e)}")

    def generate_students(self, total: int, disabled_count: int, gender_dist: str = 'random') -> List[Student]:
        students = []
        subject_names = [s.name for s in self.subjects] if self.subjects else ["Unassigned"]

        for i in range(total):
            gender = self._determine_gender(i, gender_dist)
            is_disabled = i < disabled_count
            subject = random.choice(subject_names)
            
            student = Student(
                id=f"STU{i + 1}",
                name=f"Student {i + 1}",
                gender=gender,
                subject=subject,
                is_disabled=is_disabled
            )
            students.append(student)

        self.students = students
        return students

    def _determine_gender(self, index: int, gender_dist: str) -> str:
        if gender_dist == 'alternate':
            return 'boy' if index % 2 == 0 else 'girl'
        elif gender_dist == 'all-boys':
            return 'boy'
        elif gender_dist == 'all-girls':
            return 'girl'
        else:  # random
            return 'boy' if random.random() < 0.5 else 'girl'

    def validate_student_counts(self, total_students: int, disabled_students: int) -> tuple[bool, str]:
        if total_students <= 0:
            return False, "Total students must be greater than 0"
        
        if disabled_students > total_students:
            return False, f"Number of disabled students ({disabled_students}) exceeds total students ({total_students})"
        
        subject_total = sum(s.student_count for s in self.subjects)
        if subject_total > total_students:
            return False, f"Total students in subjects ({subject_total}) exceeds total students ({total_students})"
        elif subject_total < total_students:
            return False, f"Total students in subjects ({subject_total}) is less than total students ({total_students})"
        
        if self.students and len(self.students) != total_students:
            return False, f"Number of entered students ({len(self.students)}) does not match total students ({total_students})"
        
        return True, ""

    def generate_seating_plan(self, config: dict) -> dict:
        is_valid, error_message = self.validate_student_counts(
            config['total_students'],
            config['disabled_students']
        )
        
        if not is_valid:
            return {"error": error_message}

        students = self.generate_students(
            config['total_students'],
            config['disabled_students'],
            config['gender_distribution']
        )

        seating_plan = []
        for class_num in range(config['num_classes']):
            class_plan = {
                'class_number': class_num + 1,
                'tables': []
            }
            
            settings = config['class_settings'][class_num]
            student_index = 0
            
            for row in range(settings['num_rows']):
                for col in range(settings['tables_per_row']):
                    table = {
                        'seats': [],
                        'position': {'row': row, 'col': col}
                    }
                    
                    is_priority = self._check_priority_position(
                        row, col,
                        settings['num_rows'],
                        settings['tables_per_row'],
                        config['priority_seating']
                    )
                    
                    for _ in range(config['students_per_table']):
                        if student_index < len(students):
                            student = students[student_index]
                            
                            if student.is_disabled and not is_priority:
                                continue
                                
                            if config['seating_arrangement'] == 'segregated':
                                if table['seats'] and table['seats'][-1]['gender'] != student.gender:
                                    continue
                            
                            seat = {
                                'student_id': student.id,
                                'gender': student.gender,
                                'subject': student.subject,
                                'is_disabled': student.is_disabled
                            }
                            table['seats'].append(seat)
                            student_index += 1
                    
                    class_plan['tables'].append(table)
            
            seating_plan.append(class_plan)
        
        return {
            'seating_plan': seating_plan,
            'cameras': self._generate_camera_positions(config),
            'teachers': self._generate_teacher_positions(config)
        }

    def _check_priority_position(self, row: int, col: int, total_rows: int, total_cols: int, priority: str) -> bool:
        if priority == 'front':
            return row == 0
        elif priority == 'exit':
            return col == 0 or col == total_cols - 1
        elif priority == 'both':
            return row == 0 or col == 0 or col == total_cols - 1
        return False

    def _generate_camera_positions(self, config: dict) -> List[dict]:
        cameras = []
        cameras_per_class = config['num_cameras'] // config['num_classes']
        
        for class_num in range(config['num_classes']):
            for _ in range(cameras_per_class):
                camera = {
                    'class': class_num + 1,
                    'position': {
                        'x': random.randint(0, 100),
                        'y': random.randint(0, 100)
                    }
                }
                cameras.append(camera)
        
        return cameras

    def _generate_teacher_positions(self, config: dict) -> List[dict]:
        teachers = []
        for class_num in range(config['num_classes']):
            for _ in range(config['teachers_per_class']):
                teacher = {
                    'class': class_num + 1,
                    'position': {
                        'x': random.randint(0, 100),
                        'y': random.randint(0, 100)
                    }
                }
                teachers.append(teacher)
        
        return teachers

seating_generator = SeatingGenerator()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload_excel', methods=['POST'])
def upload_excel():
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    try:
        students = seating_generator.generate_students_from_excel(file.read())
        return jsonify({
            'success': True,
            'message': f'Successfully processed {len(students)} students',
            'students': [{'id': s.id, 'name': s.name, 'gender': s.gender} for s in students]
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/generate_seating', methods=['POST'])
def generate_seating():
    try:
        config = request.json
        result = seating_generator.generate_seating_plan(config)
        
        if 'error' in result:
            return jsonify(result), 400
        
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/add_subject', methods=['POST'])
def add_subject():
    try:
        data = request.json
        seating_generator.add_subject(data['name'], data['student_count'])
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/remove_subject', methods=['POST'])
def remove_subject():
    try:
        data = request.json
        seating_generator.remove_subject(data['name'])
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

if __name__ == '__main__':
    app.run(debug=True) 