/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://tttgztjtqgzqdjpajqbw.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_x01zocxJzVMmtEcEu4RWlg_5we82YkT';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
