import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role key for admin-level access
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// A secret token to protect this endpoint
const API_SECRET_TOKEN = process.env.API_SECRET_TOKEN;

export async function POST(req: NextRequest) {
  // 1. Authenticate the request
  const authHeader = req.headers.get('Authorization');
  if (!API_SECRET_TOKEN || authHeader !== `Bearer ${API_SECRET_TOKEN}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 2. Parse the request body
    const { phone, is_blocked } = await req.json();

    // 3. Validate the input
    if (!phone || typeof is_blocked !== 'boolean') {
      return NextResponse.json({ error: 'Missing or invalid parameters. "phone" (string) and "is_blocked" (boolean) are required.' }, { status: 400 });
    }

    // 4. Find the customer by phone number
    const { data: customer, error: findError } = await supabaseAdmin
      .from('customers')
      .select('id')
      .eq('phone', phone)
      .single();

    if (findError || !customer) {
      return NextResponse.json({ error: `Customer with phone number ${phone} not found.` }, { status: 404 });
    }

    // 5. Update the customer's blocked status
    const { error: updateError } = await supabaseAdmin
      .from('customers')
      .update({ is_blocked })
      .eq('id', customer.id);

    if (updateError) {
      console.error('Error updating customer:', updateError);
      throw new Error('Failed to update customer status.');
    }

    // 6. Return a success response
    return NextResponse.json({ success: true, message: `Customer ${phone} has been ${is_blocked ? 'blocked' : 'unblocked'}.` }, { status: 200 });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('Error in /api/customers/block:', error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}