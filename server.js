const express = require('express');
const path = require('path');
const db = require('./database');
const PDFDocument = require('pdfkit');
const { convert: htmlToText } = require('html-to-text');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/todos', (req, res) => {
    db.all('SELECT * FROM todos ORDER BY sort_order ASC, created_at DESC', (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

app.post('/api/todos', (req, res) => {
    const { text } = req.body;
    if (!text) {
        return res.status(400).json({ error: 'Text is required' });
    }
    
    // Get max sort_order and add 1
    db.get('SELECT MAX(sort_order) as max_order FROM todos', (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        const newOrder = (row.max_order || 0) + 1;
        
        db.run('INSERT INTO todos (text, sort_order, notes) VALUES (?, ?, ?)', [text, newOrder, ''], function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ id: this.lastID, text, completed: 0, sort_order: newOrder, notes: '' });
        });
    });
});

app.put('/api/todos/:id', (req, res) => {
    const { id } = req.params;
    const { completed, text, notes } = req.body;
    
    console.log('PUT /api/todos/' + id, 'Body:', req.body);
    
    if (text !== undefined || notes !== undefined) {
        const updates = [];
        const values = [];
        
        if (text !== undefined) {
            updates.push('text = ?');
            values.push(text);
        }
        
        if (notes !== undefined) {
            updates.push('notes = ?');
            values.push(notes);
        }
        
        updates.push('updated_at = CURRENT_TIMESTAMP');
        values.push(id);
        
        const query = `UPDATE todos SET ${updates.join(', ')} WHERE id = ?`;
        console.log('Executing query:', query, 'with values:', values);
        
        db.run(query, values, function(err) {
            if (err) {
                console.error('Database error:', err);
                res.status(500).json({ error: err.message });
                return;
            }
            console.log('Update successful, changes:', this.changes);
            res.json({ success: true });
        });
    } else if (completed !== undefined) {
        const completedAt = completed ? 'CURRENT_TIMESTAMP' : 'NULL';
        db.run(`UPDATE todos SET completed = ?, completed_at = ${completedAt}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [completed ? 1 : 0, id], function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ success: true });
        });
    } else {
        res.status(400).json({ error: 'Either text, notes, or completed must be provided' });
    }
});

app.put('/api/todos/reorder', (req, res) => {
    const { todoIds } = req.body;
    if (!Array.isArray(todoIds)) {
        return res.status(400).json({ error: 'todoIds must be an array' });
    }
    
    // Update sort_order for each todo
    const updatePromises = todoIds.map((id, index) => {
        return new Promise((resolve, reject) => {
            db.run('UPDATE todos SET sort_order = ? WHERE id = ?', [index, id], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    });
    
    Promise.all(updatePromises)
        .then(() => {
            res.json({ success: true });
        })
        .catch(err => {
            res.status(500).json({ error: err.message });
        });
});

app.get('/api/project', (req, res) => {
    db.get('SELECT * FROM project_meta WHERE id = 1', (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(row || { title: 'Todo Project', description: '' });
    });
});

app.put('/api/project', (req, res) => {
    const { title, description } = req.body;
    
    console.log('PUT /api/project', 'Body:', req.body);
    
    if (title === undefined && description === undefined) {
        return res.status(400).json({ error: 'Title or description must be provided' });
    }
    
    const updates = [];
    const values = [];
    
    if (title !== undefined) {
        updates.push('title = ?');
        values.push(title);
    }
    
    if (description !== undefined) {
        updates.push('description = ?');
        values.push(description);
    }
    
    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(1); // id
    
    const query = `UPDATE project_meta SET ${updates.join(', ')} WHERE id = ?`;
    console.log('Executing query:', query, 'with values:', values);
    
    db.run(query, values, function(err) {
        if (err) {
            console.error('Database error:', err);
            res.status(500).json({ error: err.message });
            return;
        }
        console.log('Project update successful, changes:', this.changes);
        res.json({ success: true });
    });
});

app.get('/api/todos/export/pdf', (req, res) => {
    // Get todos first (this is the essential data)
    db.all('SELECT * FROM todos ORDER BY sort_order ASC, created_at DESC', (err, todos) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        // Try to get project info, but don't fail if table doesn't exist
        db.get('SELECT * FROM project_meta WHERE id = 1', (projectErr, project) => {
            // Use default values if project table doesn't exist or has error
            const projectTitle = project?.title || 'Todo List Export';
            const projectDescription = project?.description || '';
            
            const doc = new PDFDocument({ margin: 50 });
            
            // Set headers for PDF download
            const filename = projectTitle.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}-${new Date().toISOString().split('T')[0]}.pdf"`);
            
            doc.pipe(res);
            
            // Project Title
            doc.fontSize(24).font('Helvetica-Bold').fillColor('#000000').text(projectTitle, 50, 50);
            let yPosition = 80;
            
            // Project Description
            if (projectDescription && projectDescription.trim()) {
                doc.fontSize(12).font('Helvetica').fillColor('#666666');
                const descriptionText = htmlToText(projectDescription, {
                    wordwrap: 80,
                    preserveNewlines: true
                });
                doc.text(descriptionText, 50, yPosition, { width: 500 });
                yPosition += Math.max(30, Math.ceil(descriptionText.length / 80) * 12);
            }
            
            // Generation date
            doc.fontSize(10).font('Helvetica').fillColor('#888888');
            doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 50, yPosition);
            yPosition += 30;
        
        // Summary
        const completedCount = todos.filter(t => t.completed).length;
        const totalCount = todos.length;
        doc.fontSize(12).font('Helvetica').fillColor('#000000');
        doc.text(`Total items: ${totalCount} | Completed: ${completedCount} | Pending: ${totalCount - completedCount}`, 50, yPosition);
        yPosition += 30;
        
        todos.forEach((todo, index) => {
            // Check if we need a new page
            if (yPosition > 700) {
                doc.addPage();
                yPosition = 50;
            }
            
            // Status indicator
            const status = todo.completed ? '✓ COMPLETED' : '○ PENDING';
            const statusColor = todo.completed ? '#008000' : '#ff0000';
            
            // Todo title
            doc.fontSize(14).font('Helvetica-Bold').fillColor('#000000');
            doc.text(`${index + 1}. ${todo.text}`, 50, yPosition);
            yPosition += 20;
            
            // Status
            doc.fontSize(10).font('Helvetica').fillColor(statusColor);
            doc.text(status, 50, yPosition);
            yPosition += 15;
            
            // Notes
            if (todo.notes && todo.notes.trim()) {
                doc.fontSize(10).font('Helvetica').fillColor('#333333');
                
                // Convert HTML to formatted text
                const notesText = htmlToText(todo.notes, {
                    wordwrap: 80,
                    preserveNewlines: true
                });
                
                // Split into lines and handle formatting
                const lines = notesText.split('\n');
                doc.text('Notes:', 50, yPosition);
                yPosition += 12;
                
                lines.forEach(line => {
                    if (line.trim()) {
                        // Check if line starts with bullet or number (list item)
                        if (line.match(/^\s*[•\-\*]/) || line.match(/^\s*\d+\./)) {
                            doc.fontSize(9).text(`  ${line.trim()}`, 70, yPosition, { width: 480 });
                        } else {
                            doc.fontSize(9).text(line.trim(), 70, yPosition, { width: 480 });
                        }
                        yPosition += 12;
                    } else {
                        yPosition += 6; // Smaller gap for empty lines
                    }
                });
                
                yPosition += 5;
            }
            
            // Timestamps
            doc.fontSize(9).font('Helvetica').fillColor('#666666');
            const created = new Date(todo.created_at).toLocaleString();
            let timestampText = `Created: ${created}`;
            
            if (todo.updated_at && todo.updated_at !== todo.created_at) {
                const updated = new Date(todo.updated_at).toLocaleString();
                timestampText += ` | Updated: ${updated}`;
            }
            
            if (todo.completed_at) {
                const completed = new Date(todo.completed_at).toLocaleString();
                timestampText += ` | Completed: ${completed}`;
            }
            
            doc.text(timestampText, 50, yPosition);
            yPosition += 25;
            
            // Separator line
            doc.strokeColor('#cccccc').lineWidth(1);
            doc.moveTo(50, yPosition).lineTo(550, yPosition).stroke();
            yPosition += 15;
        });
        
            doc.end();
        });
    });
});

app.delete('/api/todos/:id', (req, res) => {
    const { id } = req.params;
    
    db.run('DELETE FROM todos WHERE id = ?', [id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ success: true });
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});