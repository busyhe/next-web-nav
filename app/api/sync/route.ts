import { streamSyncFavicons } from "@/app/actions/sync";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const stream = await streamSyncFavicons();
    return new Response(stream);
  } catch (error) {
    console.error('Error in sync API:', error);
    return Response.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
} 