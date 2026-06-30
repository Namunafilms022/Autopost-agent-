import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { invitationId, action } = body;

    if (!invitationId || !action || !['accept', 'decline'].includes(action)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const authHeader = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${authHeader}` } } },
    );

    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    // Get the invitation
    const { data: invitation, error: invErr } = await supabase
      .from('team_invitations')
      .select('*')
      .eq('id', invitationId)
      .eq('email', user.email)
      .eq('status', 'pending')
      .single();

    if (invErr || !invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    if (action === 'accept') {
      // Add user as team member
      const { error: mErr } = await supabase
        .from('team_members')
        .insert({ team_id: invitation.team_id, user_id: user.id, role: invitation.role });

      if (mErr) {
        return NextResponse.json({ error: 'Already a member' }, { status: 400 });
      }
    }

    // Update invitation status
    const { error: uErr } = await supabase
      .from('team_invitations')
      .update({ status: action === 'accept' ? 'accepted' : 'declined' })
      .eq('id', invitationId);

    if (uErr) throw uErr;

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('Invitation API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
