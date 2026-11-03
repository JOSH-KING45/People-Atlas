import {sharedAiAvailable} from '@/lib/shared-ai';
import {json} from '@/lib/server';
export function GET(){return json({sharedAiAvailable:sharedAiAvailable()})}
