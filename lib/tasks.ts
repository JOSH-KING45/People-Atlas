import {z} from 'zod';

export const taskKind = z.enum(['task','reminder','date']);
export const taskDraft = z.object({
 id:z.string().uuid(),
 personId:z.string().uuid().nullable(),
 title:z.string().trim().min(1).max(200),
 kind:taskKind,
 dueOn:z.string().date().nullable(),
 dueAt:z.string().datetime({offset:true}).nullable(),
 completed:z.boolean(),
 googleEventId:z.string().min(1).max(1024).nullable(),
 version:z.number().int().min(1).max(2147483646).optional(),
}).refine(t=>!(t.dueOn&&t.dueAt)&&(t.kind==='task'||!!t.dueAt||(t.kind==='date'&&!!t.dueOn)),{
 message:'Choose a date for an important date, or a date and time for a reminder.',
});
export type TaskDraft = z.infer<typeof taskDraft>;
export type Task = TaskDraft & {version:number};
export type TaskKind = z.infer<typeof taskKind>;
export const taskDelete = z.object({id:z.string().uuid(),version:z.number().int().positive()});
export function taskTime(task:TaskDraft){
 if(task.dueAt)return Date.parse(task.dueAt);
 if(task.dueOn)return Date.parse(task.dueOn+'T23:59:59.999');
 return Infinity;
}
