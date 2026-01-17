# NEXUS: Next-gen Education eXperience for University Students

**"The Smart Centralized Brain for Your University Life"**

NEXUS is an intelligent, AI-powered platform designed to streamline the academic lives of university students (specifically tailored for DTU). It integrates multiple AI agents to handle scheduling, content organization, study planning, and real-time query resolution, creating a cohesive "smart brain" for students.

---

## 🧠 System Architecture & Workflow

NEXUS utilizes a hybrid AI architecture, leveraging **Google Gemini** for high-precision document analysis and **OnDemand** for specialized media processing and conversational agents.

```mermaid
graph TD
    User[Student] --> Dashboard[Unified NEXUS Dashboard]

    %% ---------- INGESTION LAYER ----------
    Dashboard --> |Upload Timetable| Gemini[Gemini 1.5 Pro Agent]
    Gemini --> |Extracts| Subjects[Subjects List]
    Gemini --> |Extracts| Schedule[Class Schedule]

    Dashboard --> |Upload Notes| Classifier[Genkit Classification Agent]
    Classifier --> |Matches Subjects| Subjects
    Classifier --> |Sorts Files| FileSystem[Smart File Organizer]

    Dashboard --> |Paste YouTube URL| MediaAPI[OnDemand Media API]
    MediaAPI --> |Transcribes| Transcript[Video Transcript]

    %% ---------- CONTEXT STORE ----------
    Subjects --> Context[Student Context Store]
    Schedule --> Context
    Transcript --> Context

    Dashboard --> |Track Attendance| Attendance[Auto Attendance Tracker]
    Attendance --> |Calculates| Stats[Attendance %]
    Stats --> Context

    %% ---------- INTELLIGENCE LAYER ----------
    Context --> Advisor[AI Advisor Agent]
    Advisor --> |Analyzes CGPA & Attendance| Report[AI Performance Report]

    Context --> Planner[Daily & Exam Planner Agent]
    Planner --> |Generates| StudyPlan[Personalized Study Plan]

    Context --> Quiz[Quiz Master Agent]
    Quiz --> |Generates| QuizSet[Subject-wise Quizzes]

    Context --> Summarizer[AI Summarizer Agent]
    Summarizer --> |Condenses| Summary[Document Summary]

    %% ---------- QUERY & REASONING ----------
    Dashboard --> |Ask Query| Bot["DTU Smart Bot (OnDemand)"]
    Bot --> |Retrieves| Knowledge[DTU Official & Community Data]
    Knowledge --> Reasoning[OnDemand Chat & Reasoning Agent]

```


---

## 🚀 Key Features & AI Integration

### 1. Smart Timetable Scanner (Powered by Gemini)
- **What it does:** Users upload an image of their college timetable.
- **How it works:** A specialized **Genkit Flow** (`timetable-analysis`) uses **Google Gemini 1.5 Pro** to visually scan the image, extracting:
    - Subject Names (e.g., "Computer Networks", "DBMS")
    - Exact Class Schedules (Day, Time, Location)
- **Benefit:** Eliminates manual entry. Instantly populates the **Daily Planner** and **Attendance Tracker**.

### 2. Intelligent Auto-Classification
- **What it does:** When you upload scattered notes (PDFs, images, handwritten pages), NEXUS automatically files them into the correct subject folder.
- **How it works:** The **Classification Agent** reads the document content, compares it against your parsed `Subjects List`, and moves the file to the appropriate directory (e.g., `Notes/DBMS/Unit1.pdf`).

### 3. Media Analysis (Powered by OnDemand)
- **What it does:** Watch less, learn more. Paste a YouTube lecture link, and NEXUS extracts the knowledge for you.
- **flow:**
    1.  **Ingestion:** YouTube Video $\rightarrow$ **OnDemand Media API** (`plugin-1713961903`).
    2.  **Processing:** Video is transcribed into text asynchronously.
    3.  **Reasoning:** The transcript is fed into the **OnDemand Chat API**, allowing you to ask specific questions ("Is backpropagation explained?") and get factual YES/NO answers with evidence.

### 4. DTU Smart Bot (Personalized Agent)
- **What it does:** A specialized chatbot tuned for DTU (Delhi Technological University) students.
- **Tech Stack:** **OnDemand Chat Widget** (Bot ID: `6969fd7c...`).
- **Context Awareness:** It is injected with real-time context about the student:
    - Current CGPA
    - Attendance Shortfalls
    - Upcoming Exams
- **Capabilities:** Can answer queries using a knowledge base of verified university info.

### 5. Smart Planners & Trackers
- **Daily Planner:** Auto-generates your day's plan based on the parsed schedule + study backlog.
- **Attendance Tracker:** Linked directly to the subject list. Updates percentages in real-time as you mark classes. Provides "Bunk" alerts if attendance drops below 75%.
- **Study Planner:** Generates custom schedules for upcoming exams using AI to verify syllabus coverage.

### 6. Utility AI Tools
- **AI Summarizer:** Condenses long research papers or notes into digestible summaries.
- **Quiz Generator:** Creates dynamic quizzes based on your specific subjects to test knowledge retention.
- **CGPA Calculator:** Smart projection of your grades.

---

## 🛠️ Technology Stack

| Component | Technology | Role |
| :--- | :--- | :--- |
| **Frontend** | **Next.js 15** | Component-based UI, Server Actions, App Router |
| **Styling** | **Glassmorphism CSS** | Premium, modern aesthetic |
| **Auth** | **Auth0** | Secure user authentication |
| **AI (Vision/Text)**| **Google Gemini (via Genkit)** | Timetable OCR, File Classification |
| **AI (Media/Chat)**| **OnDemand APIs** | Video Transcription, Conversational Agents |
| **Database** | **JSON / Local Storage** | Fast, local-first data persistence |

---

## 📦 Installation

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/your-repo/brainwave.git
    cd brainwave
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

4.  **Run Development Server**
    ```bash
    npm run dev
    ```

---

## 🌟 Why NEXUS?

NEXUS isn't just a tool; it's a **Smart Operating System** for your academic life. By connecting your schedule, notes, videos, and queries into one central "Brain," it removes the administrative friction of being a student, letting you focus purely on learning.
