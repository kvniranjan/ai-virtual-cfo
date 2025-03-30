// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize charts
    initCashFlowChart();
    initRevenueChart();
    initExpensesChart();
    
    // Add event listener for the AI Assistant
    document.getElementById('sendButton').addEventListener('click', handleAIQuery);
});

// Initialize Cash Flow Chart
function initCashFlowChart() {
    const ctx = document.getElementById('cashFlowChart').getContext('2d');
    
    // Sample data for the next 90 days
    const labels = Array.from({length: 90}, (_, i) => `Day ${i+1}`);
    const cashInData = [
        45000, 42000, 38000, 46000, 39000, 41000, 43000,
        44000, 40000, 42000, 45000, 47000, 43000, 41000,
        39000, 42000, 44000, 46000, 48000, 45000, 43000,
        41000, 39000, 42000, 44000, 46000, 48000, 50000,
        47000, 45000, 43000, 41000, 39000, 42000, 44000,
        46000, 48000, 50000, 52000, 49000, 47000, 45000,
        43000, 41000, 39000, 42000, 44000, 46000, 48000,
        50000, 52000, 54000, 51000, 49000, 47000, 45000,
        43000, 41000, 39000, 42000, 44000, 46000, 48000,
        50000, 52000, 54000, 56000, 53000, 51000, 49000,
        47000, 45000, 43000, 41000, 39000, 42000, 44000,
        46000, 48000, 50000, 52000, 54000, 56000, 58000
    ];
    
    const cashOutData = [
        35000, 33000, 31000, 34000, 32000, 30000, 33000,
        35000, 37000, 34000, 32000, 30000, 33000, 35000,
        37000, 39000, 36000, 34000, 32000, 30000, 33000,
        35000, 37000, 39000, 41000, 38000, 36000, 34000,
        32000, 30000, 33000, 35000, 37000, 39000, 41000,
        43000, 40000, 38000, 36000, 34000, 32000, 30000,
        33000, 35000, 37000, 39000, 41000, 43000, 45000,
        42000, 40000, 38000, 36000, 34000, 32000, 30000,
        33000, 35000, 37000, 39000, 41000, 43000, 45000,
        47000, 44000, 42000, 40000, 38000, 36000, 34000,
        32000, 30000, 33000, 35000, 37000, 39000, 41000,
        43000, 45000, 47000, 49000, 46000, 44000, 42000
    ];
    
    const netCashFlowData = cashInData.map((cashIn, index) => cashIn - cashOutData[index]);
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Cash In',
                    data: cashInData,
                    borderColor: 'rgba(40, 167, 69, 1)',
                    backgroundColor: 'rgba(40, 167, 69, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: false
                },
                {
                    label: 'Cash Out',
                    data: cashOutData,
                    borderColor: 'rgba(220, 53, 69, 1)',
                    backgroundColor: 'rgba(220, 53, 69, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: false
                },
                {
                    label: 'Net Cash Flow',
                    data: netCashFlowData,
                    borderColor: 'rgba(13, 110, 253, 1)',
                    backgroundColor: 'rgba(13, 110, 253, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    ticks: {
                        maxTicksLimit: 12
                    }
                },
                y: {
                    beginAtZero: false
                }
            }
        }
    });
}

// Initialize Revenue Chart
function initRevenueChart() {
    const ctx = document.getElementById('revenueChart').getContext('2d');
    
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Product Sales', 'Services', 'Subscriptions', 'Other'],
            datasets: [{
                data: [45, 30, 20, 5],
                backgroundColor: [
                    'rgba(13, 110, 253, 0.8)',
                    'rgba(40, 167, 69, 0.8)',
                    'rgba(255, 193, 7, 0.8)',
                    'rgba(108, 117, 125, 0.8)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right'
                }
            }
        }
    });
}

// Initialize Expenses Chart
function initExpensesChart() {
    const ctx = document.getElementById('expensesChart').getContext('2d');
    
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Payroll', 'Rent', 'Marketing', 'Software', 'Utilities', 'Other'],
            datasets: [{
                data: [40, 15, 12, 10, 8, 15],
                backgroundColor: [
                    'rgba(220, 53, 69, 0.8)',
                    'rgba(255, 193, 7, 0.8)',
                    'rgba(13, 110, 253, 0.8)',
                    'rgba(40, 167, 69, 0.8)',
                    'rgba(111, 66, 193, 0.8)',
                    'rgba(108, 117, 125, 0.8)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right'
                }
            }
        }
    });
}

// Handle AI Assistant queries
function handleAIQuery() {
    const inputElement = document.querySelector('.input-group input');
    const query = inputElement.value.trim();
    
    if (query === '') return;
    
    // Clear the input field
    inputElement.value = '';
    
    // Sample responses based on common financial questions
    let response = '';
    
    if (query.toLowerCase().includes('cash flow') || query.toLowerCase().includes('cash position')) {
        response = 'Based on your current cash flow trends, you are projected to have a positive cash flow of approximately $12,500 by the end of the month. Your accounts receivable aging is improving, with 85% of invoices being paid within 30 days.';
    } else if (query.toLowerCase().includes('tax') || query.toLowerCase().includes('taxes')) {
        response = 'Your estimated Q1 tax payment of $2,875 is due in 14 days. Based on your current financial data, you may qualify for additional deductions related to home office expenses and business travel. Would you like me to provide more details on potential tax savings?';
    } else if (query.toLowerCase().includes('expense') || query.toLowerCase().includes('spending')) {
        response = 'Your top expense categories this month are Payroll (40%), Rent (15%), and Marketing (12%). Your marketing expenses have increased by 8% compared to last month, while other expense categories have remained relatively stable.';
    } else if (query.toLowerCase().includes('revenue') || query.toLowerCase().includes('sales')) {
        response = 'Your revenue this month is $38,500, which is 8% higher than last month. Product sales account for 45% of your revenue, followed by services at 30%. Your highest-performing product category is showing a 15% growth rate month-over-month.';
    } else if (query.toLowerCase().includes('profit') || query.toLowerCase().includes('margin')) {
        response = 'Your current profit margin is 29.1%, which is 2.1% higher than last month. This improvement is primarily due to increased revenue and stable operating costs. Your profit margin is above the industry average of 25% for your business category.';
    } else {
        response = 'I\'m analyzing your financial data to answer that question. Based on your current financial trends, I recommend focusing on optimizing your accounts receivable process and reviewing your software subscription expenses for potential cost savings.';
    }
    
    // Display the response
    const assistantMessage = document.querySelector('.assistant-message');
    assistantMessage.innerHTML = `<p>${response}</p>`;
}