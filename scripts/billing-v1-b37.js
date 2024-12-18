// Function to get the query parameter from the script's src URL
function getScriptQueryParameter(scriptSrc, param) {
    const url = new URL(scriptSrc, window.location.href); // Build a full URL from the src
    return url.searchParams.get(param); // Get the parameter value
}

// Function to format the date as "DD Month YYYY"
function formatDate(dateString) {
    const options = { day: '2-digit', month: 'long', year: 'numeric' };
    const date = new Date(dateString);
    return date.toLocaleDateString('bn-BD', options); // Bangla month names
}

// Function to show the Bootstrap modal
function showFullScreenPopup(invoices, totalDue, restrictFully, isAfter10th) {
    // Create modal dynamically
    const modalHTML = `
        <div class="modal fade" id="fullScreenPopup" tabindex="-1" role="dialog" aria-hidden="true">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header" style="background-color: #d9534f; color: #fff;">
                        <div style="background: white; padding: 10px; border-radius: 5px; margin-right: 10px; display: inline-block;">
                            <img src="https://res.cloudinary.com/abidcloud/image/upload/v1733258701/dlsoft/dlsoft-logo_xa2o0b.svg" alt="DL Soft Logo" height="40" style="display: block;">
                        </div>
                        <h4 class="modal-title text-white float-right">Access Restricted!</h4>
                    </div>
                    <div class="modal-body">
                        <div class="container-fluid">
                            <p>
                            আপনার পেন্ডিং বিল রয়েছে। সফটওয়্যার পরিষেবা চালু রাখতে অনুগ্রহ করে দ্রুত বকেয়া বিল পরিশোধ করুন।
                            আপনি নিচের "এখানে পরিশোধ করুন" বাটনের মাধ্যমে অনলাইনে পেমেন্ট করতে পারেন। এছাড়াও, বিকাশের মাধ্যমে বিল পরিশোধ করা যাবে অথবা 01915664090 নম্বরে WhatsApp বা কলের মাধ্যমে যোগাযোগ করুন। বিকাশ, নগদ, বা রকেট পার্সোনাল নম্বরে সেন্ড মানি করার পর আপনার ইনভয়েস রেফারেন্স প্রদান করুন।
                            </p>
                            ${!restrictFully && !isAfter10th ? `
                                <div class="alert alert-warning">
                                    <strong>গুরুত্বপূর্ণ:</strong> গ্রাহকদের অবশ্যই বর্তমান মাসের ১০ তারিখের মধ্যে ইনভয়েস পরিশোধ করতে হবে।
                                    <button type="button" class="btn btn-default btn-sm pull-right" id="payLaterButton">পরে পরিশোধ করুন</button>
                                </div>
                            ` : ''}
                            <table class="table table-bordered table-hover">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>ইনভয়েস আইডি</th>
                                        <th>বিলের তারিখ</th>
                                        <th>মোট (৳)</th>
                                        <th>অবস্থা</th>
                                        <th>পেমেন্ট লিংক</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${invoices.map((invoice, index) => `
                                        <tr>
                                            <td>${index + 1}</td>
                                            <td>${invoice.id}</td>
                                            <td>${formatDate(invoice.created_at)}</td>
                                            <td>৳ ${invoice.total}</td>
                                            <td>${invoice.status === 'unpaid' ? 'অপরিশোধিত' : 'পরিশোধিত'}</td>
                                            <td><a href="https://dlsoftbd.com/bill/${invoice.id}" target="_blank" class="btn btn-link">এখন পরিশোধ করুন</a></td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                            <div class="alert alert-warning">
                                <strong>মোট বকেয়া ইনভয়েস:</strong> ${totalDue}
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        ${restrictFully || isAfter10th ? '' : '<button type="button" class="btn btn-primary" onclick="window.location.reload()">পুনরায় চেষ্টা করুন</button>'}
                    </div>
                </div>
            </div>
        </div>
    `;

    // Append modal to body and show it
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    $('#fullScreenPopup').modal('show'); // Bootstrap v3 modal initialization

    // Add Pay Later functionality
    const payLaterButton = document.getElementById('payLaterButton');
    if (payLaterButton) {
        payLaterButton.addEventListener('click', () => {
            const payLaterTimestamp = new Date().getTime() + 4 * 60 * 60 * 1000; // 4 hours later
            localStorage.setItem('payLaterUntil', payLaterTimestamp);
            $('#fullScreenPopup').modal('hide');
        });
    }
}

// Function to check access from API
async function checkAccess() {
    const payLaterUntil = localStorage.getItem('payLaterUntil');
    const currentTime = new Date().getTime();

    if (payLaterUntil && currentTime < parseInt(payLaterUntil)) {
        console.log('Pay Later active. Popup will not show.');
        return;
    }

    // Get the script tag's src to extract the query parameter (app.js?id=1)
    const scriptSrc = document.currentScript.src;
    const id = getScriptQueryParameter(scriptSrc, 'id'); // Get ID from the URL query

    if (!id) {
        console.error('ID not found in query string');
        return;
    }

    try {
        const response = await fetch(`https://dlsoftbd.com/api/tracker/info/${id}`);
        const data = await response.json();

        const currentDate = new Date();
        const isAfter10th = currentDate.getDate() > 10;

        if (data.allow_access === false) {
            // Restrict access fully if allow_access is false
            showFullScreenPopup(data.invoices, data.total_due_invoices, true, isAfter10th);
        } else if (data.allow_access === true && data.invoices.length > 0) {
            // Allow access but show the popup with invoices
            showFullScreenPopup(data.invoices, data.total_due_invoices, false, isAfter10th);
        }
    } catch (error) {
        console.error('Error fetching access data:', error);
    }
}

// Run the check on page load
checkAccess();
