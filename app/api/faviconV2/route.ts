import { NextResponse, NextRequest } from 'next/server';

console.log( '11111111' );

export async function GET(request: NextRequest) {
  // Get the original request URL
  const url = new URL(request.url);
  
  // Get all search parameters
  const searchParams = url.searchParams;
  const paramsString = searchParams.toString();
  
  // Create the target URL for Google's favicon service
  const targetUrl = `https://t2.gstatic.com/faviconV2?${paramsString}`;
  
  try {

    console.debug('[DEBUG__faviconV2/route.ts-targetUrl]', targetUrl)
    // Fetch the favicon from Google's service
    const response = await fetch(targetUrl);
    
    // Get the response data as an array buffer
    const data = await response.arrayBuffer();
    
    // Return the response with appropriate headers
    return new NextResponse(data, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'image/x-icon',
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
      }
    });
  } catch (error) {
    console.error('Error proxying favicon:', error);
    return new NextResponse('Error fetching favicon', { status: 500 });
  }
} 