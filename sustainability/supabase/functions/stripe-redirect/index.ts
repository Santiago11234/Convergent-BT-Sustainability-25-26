// Supabase Edge Function: Stripe Redirect Handler
// Purpose: Redirects Stripe Connect callbacks to the mobile app via deep link
// Deployed at: https://[project-ref].supabase.co/functions/v1/stripe-redirect

Deno.serve(async (req) => {
  console.log('=== STRIPE REDIRECT STARTED ===')
  console.log('Request method:', req.method)
  console.log('Request URL:', req.url)

  // Log all request headers
  console.log('Request headers:')
  req.headers.forEach((value, key) => {
    console.log(`  ${key}: ${value}`)
  })

  try {
    const url = new URL(req.url)
    console.log('Parsed URL successfully')
    console.log('URL pathname:', url.pathname)
    console.log('URL search params:', url.search)
    console.log('All URL params:', Array.from(url.searchParams.entries()))

    const onboarding = url.searchParams.get('onboarding')
    console.log('Onboarding param value:', onboarding)

    // Build the deep link URL
    const deepLink = `sustainability://seller?onboarding=${onboarding || 'complete'}`
    console.log('Generated deep link:', deepLink)

  // Return an HTML page that redirects to the deep link
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Redirecting...</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
          }
          .container {
            text-align: center;
            padding: 2rem;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 1rem;
            backdrop-filter: blur(10px);
          }
          h1 { margin-bottom: 1rem; }
          .spinner {
            border: 3px solid rgba(255, 255, 255, 0.3);
            border-top: 3px solid white;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 2rem auto;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          a {
            color: white;
            text-decoration: underline;
            margin-top: 1rem;
            display: inline-block;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Success! 🎉</h1>
          <p>Returning you to the app...</p>
          <div class="spinner"></div>
          <p><small>If you're not redirected automatically,<br><a href="${deepLink}">click here</a></small></p>
        </div>
        <script>
          // Attempt to open the deep link
          window.location.href = '${deepLink}';

          // Fallback: Show manual link after a delay
          setTimeout(() => {
            const container = document.querySelector('.container');
            container.innerHTML = '<h1>Almost there!</h1><p>Please tap the button below to return to the app:</p><br><a href="${deepLink}" style="padding: 1rem 2rem; background: white; color: #667eea; border-radius: 0.5rem; text-decoration: none; font-weight: bold; display: inline-block;">Open Sustainability App</a>';
          }, 2000);
        </script>
      </body>
    </html>
  `

    console.log('Preparing HTML response')
    console.log('HTML length:', html.length)

    const response = new Response(html, {
      headers: {
        'Content-Type': 'text/html',
      },
    })

    console.log('Response created successfully')
    console.log('Response status:', response.status)
    console.log('=== STRIPE REDIRECT COMPLETED ===')

    return response

  } catch (error) {
    console.error('=== STRIPE REDIRECT ERROR ===')
    console.error('Error type:', error?.constructor?.name)
    console.error('Error message:', error?.message)
    console.error('Error stack:', error?.stack)
    console.error('Full error object:', JSON.stringify(error, null, 2))

    // Return error page
    const errorHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Error</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background: #f3f4f6;
            }
            .container {
              text-align: center;
              padding: 2rem;
              background: white;
              border-radius: 1rem;
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>⚠️ Error</h1>
            <p>Something went wrong with the redirect.</p>
            <p><small>${error?.message || 'Unknown error'}</small></p>
            <p><a href="sustainability://seller">Return to app</a></p>
          </div>
        </body>
      </html>
    `

    return new Response(errorHtml, {
      status: 500,
      headers: {
        'Content-Type': 'text/html',
      },
    })
  }
})
