# SurgiTrack — Intelligent Surgical Instrument Reconciliation System

🥈 **2nd Place — INARA BIOHACKATHON 2026**  
Built by **Team Genomix**

---

## Overview

**SurgiTrack** is an intelligent surgical instrument tracking and reconciliation system designed to reduce instrument misplacement and improve accountability in operating-room workflows.

The system combines:

- RFID-based instrument identification
- Computer vision-based tray verification
- Pre-operative and post-operative reconciliation
- Live instrument Time-In / Time-Out tracking
- Role-based workflow
- Final mismatch detection
- Procedure history and audit records

SurgiTrack is designed as a low-friction digital layer that complements existing surgical counting workflows.

---

## Problem Statement

In busy clinical and surgical environments, instruments may be misplaced, temporarily lost, or become difficult to account for during time-sensitive procedures.

Manual tracking can be affected by:

- Human error
- High-pressure working conditions
- Repeated manual counting
- Lack of real-time visibility
- Difficulty maintaining instrument identity
- Delayed recognition of missing tools
- Limited digital audit trails

SurgiTrack addresses this by combining **RFID identity tracking** with **computer vision-based tray verification**.

---

## Solution

SurgiTrack uses two complementary verification layers.

### RFID Layer

Identifies individual surgical instruments using RFID tags and links each instrument to the digital procedure record.

### Vision Layer

Verifies the instruments physically visible on the surgical tray through image-based analysis.

The outputs of both layers are combined during final reconciliation.

```text
RFID Identity
      +
Visual Presence
      +
Procedure Inventory
      ↓
Final Reconciliation
      ↓
MATCH / MISMATCH
```

---

## System Workflow

```text
Login
  ↓
Dashboard
  ↓
New Procedure
  ↓
RFID Registration
  ↓
Pre-Op Scan
  ↓
Procedure Active
  ↓
Live RFID Time-In / Time-Out
  ↓
Post-Op RFID Recheck
  ↓
Post-Op Image Scan
  ↓
Final Reconciliation
  ↓
Procedure History
```

---

## Key Features

### Role-Based Access

The system supports three operating-room roles:

- Doctor
- OT Technician
- Nurse

This allows the application workflow to remain relevant to actual OT responsibilities.

---

### RFID Instrument Identification

SurgiTrack uses an **Arduino UNO + RC522 RFID reader** to identify surgical instruments.

Each RFID tag is linked to an instrument stored in the master database.

Example workflow:

```text
RFID Tag
   ↓
Arduino UNO
   ↓
Serial Communication
   ↓
PySerial
   ↓
FastAPI Backend
   ↓
SQLite Database
   ↓
Instrument Identity
```

---

### Live Instrument Tracking

During an active procedure, SurgiTrack can record:

- RFID Number
- Instrument Name
- Time In
- Time Out

This creates a digital record of instrument activity throughout the procedure.

Example:

```text
RFID No.        Instrument     Time In       Time Out
------------------------------------------------------
91:9C:92:66     Scissors       10:21:04      10:34:18
A0:C2:5E:54     Scalpel        10:22:11      10:36:03
```

---

### Pre-Operative Verification

Before the procedure begins:

1. Instruments are registered using RFID.
2. A tray image is captured or uploaded.
3. The expected surgical inventory is stored as the baseline.

Example:

```text
PRE-OP BASELINE

Scissors    1
Scalpel     1
```

This baseline is later used for comparison during post-operative reconciliation.

---

### Procedure Monitoring

While the procedure is active, SurgiTrack maintains a live digital instrument record.

The system can track whether an instrument is currently:

```text
IN
or
OUT
```

This provides better visibility into instrument movement during the procedure.

---

### Post-Operative RFID Recheck

At the end of the procedure, instruments are rescanned using RFID.

The system checks whether the instruments registered before the procedure have been returned.

Possible RFID outcomes include:

- Returned
- Missing
- Unexpected
- Unknown RFID

---

### Post-Operative Vision Verification

A final surgical tray image can be captured or uploaded.

The post-operative inventory is compared with the pre-operative reference.

Example:

```text
PRE-OP

Scissors    1
Scalpel     1

POST-OP

Scissors    1
Scalpel     1

RESULT

MATCH
```

---

## Final Reconciliation

The final reconciliation stage combines the major verification sources.

```text
Pre-Op Expected Inventory
        +
Post-Op RFID Inventory
        +
Post-Op Vision Result
        ↓
Final Reconciliation
```

Possible outcomes:

```text
MATCH
MISMATCH
```

A mismatch may indicate:

- Missing instrument
- Unexpected instrument
- Unknown RFID tag
- Incomplete RFID recheck
- Visual inventory mismatch
- Incomplete procedure verification

This provides an additional digital safety layer before the procedure record is finalized.

---

## System Architecture

```text
                    ┌─────────────────────┐
                    │    React Frontend   │
                    │     Vite + UI       │
                    └──────────┬──────────┘
                               │
                               │ REST API
                               ▼
                    ┌─────────────────────┐
                    │   FastAPI Backend   │
                    └───────┬─────┬───────┘
                            │     │
                ┌───────────┘     └────────────┐
                ▼                              ▼
        ┌──────────────┐               ┌───────────────┐
        │ SQLite + ORM │               │ Vision/CNN    │
        │ SQLAlchemy   │               │ Service       │
        └──────────────┘               └───────┬───────┘
                                               │
                                               ▼
                                        ┌──────────────┐
                                        │ Tray Image   │
                                        │ Camera/File  │
                                        └──────────────┘

                ┌──────────────┐
                │ Arduino UNO  │
                └───────┬──────┘
                        │
                        ▼
                ┌──────────────┐
                │ RC522 RFID   │
                │ Reader       │
                └───────┬──────┘
                        │
                        ▼
                ┌──────────────┐
                │ RFID Tags    │
                └──────────────┘
```

---

## Technology Stack

| Component | Technology |
|---|---|
| Frontend | React |
| Build Tool | Vite |
| Styling | Tailwind CSS |
| Animation | Framer Motion |
| Icons | Lucide React |
| Backend | FastAPI |
| Backend Language | Python |
| Database | SQLite |
| ORM | SQLAlchemy |
| Authentication | Token-based authentication |
| Computer Vision | CNN-based image processing |
| Microcontroller | Arduino UNO |
| RFID Reader | RC522 |
| Serial Communication | PySerial |
| API Style | REST |
| Version Control | Git + GitHub |
| Large File Support | Git LFS |

---

## Project Structure

```text
SurgiTrack-INARA/
│
├── app/
│   ├── routes/
│   ├── services/
│   ├── auth.py
│   ├── config.py
│   ├── database.py
│   ├── main.py
│   ├── models.py
│   └── schemas.py
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   ├── services/
│   │   └── utils/
│   │
│   ├── package.json
│   └── vite.config.js
│
├── CNN_Service/
│   └── ai/
│
├── hardware/
│   ├── arduino/
│   └── rfid/
│
├── tests/
│
├── .gitignore
├── .gitattributes
└── README.md
```

---

## Application Screens

The application contains the following main screens:

```text
Login
Dashboard
New Procedure
RFID Registration
Pre-Op Scan
Procedure Active
Post-Op Scan
Final Reconciliation
History
```

---

## Installation

### Clone the Repository

```bash
git clone https://github.com/Annwesh02-rip/SurgiTrack-INARA.git
```

Then:

```bash
cd SurgiTrack-INARA
```

---

## Backend Setup

Create a Python virtual environment:

```powershell
python -m venv .venv
```

Activate it:

```powershell
.\.venv\Scripts\Activate.ps1
```

Install dependencies:

```powershell
pip install -r requirements.txt
```

Start the FastAPI backend:

```powershell
python -m uvicorn app.main:app --reload
```

Backend URL:

```text
http://127.0.0.1:8000
```

Swagger API documentation:

```text
http://127.0.0.1:8000/docs
```

---

## Frontend Setup

Open another terminal:

```powershell
cd frontend
```

Install packages:

```powershell
npm install
```

Start the development server:

```powershell
npm run dev
```

Frontend URL:

```text
http://localhost:5173
```

---

## RFID Hardware

The SurgiTrack prototype uses:

- Arduino UNO
- RC522 RFID Reader
- RFID Tags
- USB Serial Communication

During prototype development, the Arduino was connected through:

```text
COM15
```

The COM port can be changed according to the host computer.

---

## Arduino Setup

Install the Arduino AVR core:

```powershell
arduino-cli core install arduino:avr
```

Compile the Arduino sketch:

```powershell
arduino-cli compile --fqbn arduino:avr:uno .\hardware\arduino\surgitrack_rfid
```

Upload to Arduino:

```powershell
arduino-cli upload -p COM15 --fqbn arduino:avr:uno .\hardware\arduino\surgitrack_rfid
```

Make sure another program is not using the COM port during upload.

---

## RFID Workflow

```text
Instrument RFID Tag
        ↓
RC522 Reader
        ↓
Arduino UNO
        ↓
Serial Output
        ↓
PySerial
        ↓
FastAPI
        ↓
SQLite Instrument Database
        ↓
Instrument Identified
```

---

## Computer Vision Workflow

```text
Tray Image
   ↓
Image Capture / Upload
   ↓
FastAPI Image Endpoint
   ↓
Vision Service
   ↓
CNN Processing
   ↓
Instrument Detection
   ↓
Inventory Comparison
   ↓
Final Reconciliation
```

The current prototype demonstration includes:

- Scissors
- Scalpel

The architecture can be expanded to additional surgical instruments.

---

## Database

SurgiTrack uses **SQLite with SQLAlchemy**.

The database can store:

- Users
- Procedures
- Instrument master records
- RFID identifiers
- Procedure instruments
- Scan information
- Verification status
- Procedure history

Local database files are excluded from GitHub using `.gitignore`.

---

## Prototype Status

SurgiTrack is currently a **hackathon prototype and research demonstration**.

The primary goal of the prototype is to demonstrate the complete integration of:

```text
RFID
+
Computer Vision
+
Backend
+
Database
+
Frontend
+
Reconciliation
```

Certain prototype components may use deterministic demonstration behavior to ensure reliable presentation of the full workflow during hackathon evaluation.

The architecture allows these modules to be replaced by larger trained models and validated hardware in future versions.

---

## Novelty

SurgiTrack does not rely on only one tracking technology.

Instead, it combines:

```text
RFID-based identity
        +
Visual confirmation
        +
Temporal tracking
        +
Procedure reconciliation
```

This creates multiple layers of instrument verification.

The concept is designed around workflow integration rather than simply detecting or tagging surgical tools.

---

## Future Scope

Future development may include:

- Larger surgical instrument datasets
- Multi-class object detection
- Real-time video inference
- Improved CNN architecture
- RFID antennas integrated into OT tables
- On-metal RFID surgical instrument tags
- Load-cell based tray verification
- Optical sensing
- Automated sterilization tracking
- Instrument usage analytics
- Multi-operating-room dashboards
- Hospital HIS integration
- Cloud deployment
- Hospital-local server deployment
- Automated audit reports
- Missing-instrument alerts
- Mobile companion application
- Predictive inventory management
- Sterilization-cycle traceability
- Instrument maintenance monitoring

---

## Safety Philosophy

SurgiTrack is based on **redundant verification**.

Instead of relying entirely on RFID or computer vision, multiple independent sources are combined.

```text
RFID Identity
     +
Visual Detection
     +
Procedure Inventory
     +
Time Tracking
     ↓
Final Reconciliation
```

This approach can improve traceability and provide additional verification during surgical instrument accounting.

---

## Disclaimer

SurgiTrack is currently a **research and hackathon prototype**.

It is not a certified medical device and should not be used as the sole method for surgical instrument counting or clinical decision-making.

Clinical deployment would require:

- Clinical validation
- Regulatory approval
- Cybersecurity assessment
- Hardware qualification
- Medical device compliance
- Hospital workflow validation
- Extensive testing with real surgical environments

---

# Team Genomix

## Team Lead

**Mouli Roy**  
M.Tech Biotechnology

## Team Members

- **Annwesh**
- **Hritwika**
- **Swastik**
- **Prerna**

---

# Achievement

## 🥈 2nd Place — WhyCode_4U 2026 Hackathon

Developed by **Team Genomix**, SurgiTrack secured **2nd Place** at the WhyCode_4U 2026 Hackathon.

The project demonstrated the integration of:

- RFID-based surgical instrument identification
- Computer vision-based tray verification
- Real-time instrument tracking
- Pre-operative and post-operative workflow
- Digital reconciliation
- Mismatch detection
- Hardware-software integration
- Full-stack operating-room workflow

into a unified working prototype.

---

## Repository

**GitHub Repository**

```text
https://github.com/Annwesh02-rip/SurgiTrack-INARA
```

---

## Contributors

Built by **Team Genomix** for the **WhyCode_4U 2026 Hackathon**.

---

<p align="center">
  <b>SurgiTrack</b><br>
  RFID × Computer Vision × Surgical Safety
</p>

<p align="center">
  🥈 2nd Place — WhyCode_4U 2026 Hackathon
</p>
