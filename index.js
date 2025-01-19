import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Multer setup for handling file uploads
const upload = multer();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use(session({
  secret: 'bariguru-secret',
  resave: false,
  saveUninitialized: false
}));

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Get unique colleges
app.get('/api/colleges', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('writers')
      .select('college_name')
      .eq('status', 'approved')
      .order('college_name');

    if (error) throw error;

    // Get unique colleges
    const uniqueColleges = [...new Set(data.map(writer => writer.college_name))];
    res.json(uniqueColleges);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get unique branches
app.get('/api/branches', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('writers')
      .select('branch')
      .eq('status', 'approved')
      .order('branch');

    if (error) throw error;

    // Get unique branches
    const uniqueBranches = [...new Set(data.map(writer => writer.branch))];
    res.json(uniqueBranches);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Handle file upload
app.post('/api/upload-student-id', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    try {
        const timestamp = Date.now();
        const fileExt = req.file.originalname.split('.').pop();
        const fileName = `${timestamp}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `student-ids/${fileName}`;

        const { data, error } = await supabase.storage
            .from('student-id-bucket')
            .upload(filePath, req.file.buffer, {
                contentType: req.file.mimetype,
                upsert: false
            });

        if (error) {
            console.error('Storage error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }

        // Get the public URL for the uploaded file
        const { data: { publicUrl } } = supabase.storage
            .from('student-id-bucket')
            .getPublicUrl(filePath);

        res.json({ success: true, url: publicUrl });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ success: false, message: 'Failed to upload file' });
    }
});

// Writer application submission
app.post('/api/writers/apply', async (req, res) => {
    console.log("Received application data:", req.body);
    try {
        const { data, error } = await supabase
            .from('writer_applications')
            .insert([{
                first_name: req.body.firstName,
                last_name: req.body.lastName,
                college_name: req.body.collegeName,
                branch: req.body.branch,
                email: req.body.email,
                rate_per_ten_pages: req.body.ratePerTenPages,
                student_id_url: req.body.studentIdUrl
            }]);

        if (error) {
            console.error("Database error:", error);
            return res.status(500).json({ success: false, message: error.message });
        }

        res.json({ success: true });
    } catch (error) {
        console.error("Server error:", error);
        res.status(500).json({ success: false, message: "Server error occurred." });
    }
});

// Get approved writers
app.get('/api/writers', async (req, res) => {
  const { college, branch } = req.query;
  
  try {
    let query = supabase
      .from('writers')
      .select('*')
      .eq('status', 'approved');

    if (college) {
      query = query.eq('college_name', college);
    }
    if (branch) {
      query = query.eq('branch', branch);
    }

    const { data, error } = await query;
    if (error) throw error;
    
    res.json(data);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin routes
app.get('/api/admin/applications', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('writer_applications')
      .select('*')
      .eq('status', 'pending');

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/admin/approve/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    // First, get the application data
    const { data: application, error: fetchError } = await supabase
      .from('writer_applications')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    // Insert into writers table
    const { error: insertError } = await supabase
      .from('writers')
      .insert([{
        first_name: application.first_name,
        last_name: application.last_name,
        college_name: application.college_name,
        branch: application.branch,
        email: application.email,
        rate_per_ten_pages: application.rate_per_ten_pages,
        student_id_url: application.student_id_url,
        status: 'approved'
      }]);

    if (insertError) throw insertError;

    // Update application status
    const { error: updateError } = await supabase
      .from('writer_applications')
      .update({ status: 'approved' })
      .eq('id', id);

    if (updateError) throw updateError;

    res.json({ success: true, message: 'Writer approved successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/admin/writers/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const { error } = await supabase
      .from('writers')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true, message: 'Writer deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/admin/writers/:id', async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;
  
  try {
    const { error } = await supabase
      .from('writers')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true, message: 'Writer updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(port, () => {
  console.log(`BariGuru server running at http://localhost:${port}`);
});