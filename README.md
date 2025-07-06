# Terminal Todo App

A retro-styled, terminal-inspired todo application with rich text notes, drag-and-drop functionality, and professional PDF export capabilities.

![Terminal Todo App](https://img.shields.io/badge/status-active-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)
![Node.js](https://img.shields.io/badge/node.js-v18+-green)

## Features

### 🎯 Core Todo Management
- **Add/Edit/Delete Todos**: Create and manage your tasks with ease
- **Completion Tracking**: Check off completed items with visual status indicators
- **Drag & Drop Reordering**: Reorganize todos by dragging them to new positions
- **Persistent Storage**: SQLite database ensures your data is saved

### 📝 Rich Text Notes
- **WYSIWYG Editor**: Full rich text editing with Quill.js
- **Auto-Save**: Notes save automatically as you type (2-second delay)
- **Smart Exit**: Click away to save and close editor
- **Formatting Support**: Bold, italic, headers, lists, blockquotes
- **Terminal Styling**: Dark theme with green accents

### 📊 Project Management
- **Project Title & Description**: Add context to your todo lists
- **Rich Text Descriptions**: Use the same WYSIWYG editor for project details
- **Professional Headers**: Project info appears prominently at the top

### 📄 PDF Export
- **Professional Reports**: Generate clean, formatted PDF exports
- **Rich Text Conversion**: HTML formatting converted to readable text
- **Complete Metadata**: Includes creation, update, and completion timestamps
- **Project Context**: Project title and description included in exports
- **Status Tracking**: Clear indication of completed vs pending items

### 🎨 Terminal Aesthetic
- **Retro Styling**: Black background with bright green text
- **Monospace Font**: Courier New for that authentic terminal feel
- **Live Clock**: Real-time display in the top-right corner
- **Responsive Design**: Works on desktop and mobile devices

## Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd terminal-todo-app
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the application:**
   ```bash
   npm start
   ```

4. **Open your browser:**
   Navigate to `http://localhost:3000`

## Usage

### Getting Started
1. **Set Project Info**: Click "EDIT PROJECT" to add your project title and description
2. **Add Todos**: Use the input field at the top to add new todo items
3. **Organize**: Drag and drop todos to reorder them
4. **Add Notes**: Click "NOTES" on any todo to add detailed rich text notes
5. **Export**: Use the "📄 EXPORT TO PDF" button to generate reports

### Keyboard Shortcuts
- **Enter**: Add new todo (when in input field)
- **Enter**: Save notes (when in notes editor)
- **Escape**: Cancel note editing
- **Click away**: Auto-save and close notes editor

### Notes Features
- **Bold Text**: Use Ctrl/Cmd + B or the toolbar
- **Italic Text**: Use Ctrl/Cmd + I or the toolbar
- **Headers**: Select from H1, H2, H3 in the dropdown
- **Lists**: Create ordered or unordered lists
- **Blockquotes**: For important information
- **Auto-save**: Changes save automatically after 2 seconds of inactivity

## Technology Stack

- **Backend**: Node.js with Express
- **Database**: SQLite3 for data persistence
- **Frontend**: Vanilla JavaScript with HTML5/CSS3
- **Rich Text**: Quill.js WYSIWYG editor
- **PDF Generation**: PDFKit for report generation
- **HTML Processing**: html-to-text for PDF formatting

## File Structure

```
terminal-todo-app/
├── server.js              # Express server and API endpoints
├── database.js            # SQLite database setup and schema
├── package.json           # Dependencies and scripts
├── public/
│   └── index.html         # Frontend application
├── todos.db               # SQLite database (auto-generated)
├── LICENSE                # MIT License
└── README.md              # This file
```

## API Endpoints

### Todos
- `GET /api/todos` - Get all todos
- `POST /api/todos` - Create new todo
- `PUT /api/todos/:id` - Update todo (text, notes, or completion status)
- `DELETE /api/todos/:id` - Delete todo
- `PUT /api/todos/reorder` - Update todo order

### Project
- `GET /api/project` - Get project information
- `PUT /api/project` - Update project title/description

### Export
- `GET /api/todos/export/pdf` - Download PDF export

## Database Schema

### Todos Table
```sql
CREATE TABLE todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL,
    completed INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME NULL,
    sort_order INTEGER DEFAULT 0,
    notes TEXT DEFAULT ''
);
```

### Project Metadata Table
```sql
CREATE TABLE project_meta (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    title TEXT DEFAULT 'Todo Project',
    description TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Configuration

### Port Configuration
The server runs on port 3000 by default. Change via environment variable:
```bash
PORT=8080 npm start
```

### Database Location
The SQLite database is created as `todos.db` in the project root. To reset:
```bash
rm todos.db
npm start  # Will recreate with fresh schema
```

## Development

### Running in Development Mode
```bash
# Install dependencies
npm install

# Start server (auto-restarts on file changes with nodemon)
npm run dev  # If you add nodemon to package.json

# Or manual restart
npm start
```

### Adding Features
1. **Backend**: Modify `server.js` for new API endpoints
2. **Database**: Update `database.js` for schema changes
3. **Frontend**: Edit `public/index.html` for UI changes

## Troubleshooting

### Common Issues

**PDF Export Not Working**
- Restart the server to ensure schema is up-to-date
- Check console for database errors
- Verify html-to-text dependency is installed

**Notes Not Saving**
- Check browser console for JavaScript errors
- Verify server is running and accessible
- Check network tab for failed API requests

**Drag and Drop Issues**
- Ensure JavaScript is enabled
- Check for console errors
- Try refreshing the page

**Database Errors**
- Delete `todos.db` and restart to recreate schema
- Ensure write permissions in project directory

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- **Quill.js** - For the excellent WYSIWYG editor
- **PDFKit** - For PDF generation capabilities
- **SQLite** - For lightweight, reliable data storage
- **Express.js** - For the web framework
- Terminal aesthetics inspired by retro computing

---

**Built with ❤️ for productivity enthusiasts who love the terminal aesthetic**