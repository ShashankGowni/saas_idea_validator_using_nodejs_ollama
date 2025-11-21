const form = document.getElementById('idea-form');
const responseDiv = document.getElementById('response');
const loadingDiv = document.getElementById('loading');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const idea = document.getElementById('idea').value.trim();
  console.log("idea:",idea)
  responseDiv.textContent = '';
  if (!idea) {
    responseDiv.textContent = 'Please enter your SaaS idea.';
    return;
  }
  loadingDiv.style.display = 'block';
  try {
    const res = await fetch('/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idea })
    });
    const data = await res.json();
    if (data.error) {
      responseDiv.textContent = 'Error: ' + data.error;
    } else {
      responseDiv.textContent = 'AI Response: ' + data.response;
    }
  } catch (err) {
    responseDiv.textContent = 'Something went wrong. Please try again.';
  } finally {
    loadingDiv.style.display = 'none';
  }
});
