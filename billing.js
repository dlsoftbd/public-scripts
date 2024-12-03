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
    <div class="modal fade" id="fullScreenPopup" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered modal-fullscreen">
            <div class="modal-content">
                <div class="modal-header bg-danger text-white d-flex align-items-center">
                    <div class="bg-white p-2 rounded me-2">
                        <img src="https://res.cloudinary.com/abidcloud/image/upload/v1733258701/dlsoft/dlsoft-logo_xa2o0b.svg" alt="DL Soft Logo" height="40">
                    </div>
                    <h5 class="modal-title mb-0">Restricted Access!</h5>
                </div>
                <div class="modal-body">
                    <div class="container">
                        <p class="mb-3">আপনার বিল বকেয়া রয়েছে। সফটওয়্যারটি ব্যবহার করতে আপনার বকেয়া পরিশোধ করুন।</p>
                            ${!restrictFully && !isAfter10th ? `
                                <div class="alert alert-warning d-flex justify-content-between align-items-center">
                                    <strong>গুরুত্বপূর্ণ: </strong> গ্রাহকদের অবশ্যই বর্তমান মাসের ১০ তারিখের মধ্যে বকেয়া পরিশোধ করতে হবে।
                                    <button type="button" class="btn btn-secondary btn-sm" id="payLaterButton">পরে পরিশোধ করুন</button>
                                </div>
                            ` : ''}
                            <table class="table table-bordered table-hover mt-3">
                                <thead class="table-light">
                                    <tr>
                                        <th>#</th>
                                        <th>ইনভয়েস আইডি</th>
                                        <th>তারিখ</th>
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
                            <div class="alert alert-warning mt-4">
                                <strong>মোট বকেয়া ইনভয়েস: </strong> ${totalDue}
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
    const modalElement = new bootstrap.Modal(document.getElementById('fullScreenPopup'));
    modalElement.show();
    
    // Add Pay Later functionality
    const payLaterButton = document.getElementById('payLaterButton');
    if (payLaterButton) {
        payLaterButton.addEventListener('click', () => {
            const payLaterTimestamp = new Date().getTime() + 4 * 60 * 60 * 1000; // 4 hours later
            localStorage.setItem('payLaterUntil', payLaterTimestamp);
            modalElement.hide();
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

