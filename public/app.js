// Show/hide sections
function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(section => {
        section.classList.add('hidden');
    });
    document.getElementById(sectionId).classList.remove('hidden');
    
    if (sectionId === 'writers') {
        loadWriters();
        loadFilterOptions();
    }
}

// Load filter options
async function loadFilterOptions() {
    try {
        // Load colleges
        const collegesResponse = await fetch('/api/colleges');
        const colleges = await collegesResponse.json();
        
        const collegeSelect = document.getElementById('collegeFilter');
        collegeSelect.innerHTML = '<option value="">All Colleges</option>' +
            colleges.map(college => `<option value="${college}">${college}</option>`).join('');

        // Load branches
        const branchesResponse = await fetch('/api/branches');
        const branches = await branchesResponse.json();
        
        const branchSelect = document.getElementById('branchFilter');
        branchSelect.innerHTML = '<option value="">All Branches</option>' +
            branches.map(branch => `<option value="${branch}">${branch}</option>`).join('');
    } catch (error) {
        console.error('Error loading filter options:', error);
    }
}

// Load writers
async function loadWriters(college = '', branch = '') {
    const writersList = document.getElementById('writersList');
    writersList.innerHTML = 'Loading...';

    try {
        let url = '/api/writers';
        if (college || branch) {
            const params = new URLSearchParams();
            if (college) params.append('college', college);
            if (branch) params.append('branch', branch);
            url += `?${params.toString()}`;
        }

        const response = await fetch(url);
        const writers = await response.json();

        writersList.innerHTML = writers.map(writer => `
            <div class="writer-card">
                <h3>${writer.first_name} ${writer.last_name}</h3>
                <p>College: ${writer.college_name}</p>
                <p>Branch: ${writer.branch}</p>
                <p>Rate: $${writer.rate_per_ten_pages} per 10 pages</p>
                <a href="mailto:${writer.email}">Contact Writer</a>
            </div>
        `).join('');
    } catch (error) {
        writersList.innerHTML = 'Error loading writers. Please try again.';
    }
}

// Filter writers
function filterWriters() {
    const college = document.getElementById('collegeFilter').value;
    const branch = document.getElementById('branchFilter').value;
    loadWriters(college, branch);
}

// Handle writer application form
document.getElementById('writerApplicationForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log("Form submitted");

    // Get the file from the file input
    const fileInput = document.getElementById('studentId');
    const file = fileInput.files[0];

    if (!file) {
        alert('Please upload your Student ID card image.');
        return;
    }

    try {
        // First, upload the file
        const formData = new FormData();
        formData.append('file', file);

        const uploadResponse = await fetch('/api/upload-student-id', {
            method: 'POST',
            body: formData
        });

        const uploadResult = await uploadResponse.json();
        
        if (!uploadResult.success) {
            throw new Error(uploadResult.message || 'Failed to upload file');
        }

        // Then submit the form data with the file URL
        const applicationData = {
            firstName: document.getElementById('firstName').value,
            lastName: document.getElementById('lastName').value,
            collegeName: document.getElementById('collegeName').value,
            branch: document.getElementById('branch').value,
            email: document.getElementById('email').value,
            ratePerTenPages: parseFloat(document.getElementById('ratePerTenPages').value),
            studentIdUrl: uploadResult.url
        };

        console.log("Sending form data:", applicationData);

        const response = await fetch('/api/writers/apply', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(applicationData)
        });

        const result = await response.json();
        console.log("Server response:", result);

        if (result.success) {
            alert('Application submitted successfully! We will review your application.');
            e.target.reset();
            showSection('main');
        } else {
            alert(result.message || 'Error submitting application. Please try again.');
        }
    } catch (error) {
        console.error('Error submitting form:', error);
        alert('An unexpected error occurred. Please try again later.');
    }
});