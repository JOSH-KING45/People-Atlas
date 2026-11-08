import {z} from 'zod';

export const GOOGLE_CALENDAR_READ_SCOPE='https://www.googleapis.com/auth/calendar.events.readonly';
export type CalendarImportEvent={id:string;title:string;date:string;time:string|null};
const eventSchema=z.object({
 id:z.string().min(1).max(1024),
 iCalUID:z.string().optional(),
 summary:z.string().optional(),
 status:z.string().optional(),
 start:z.object({date:z.string().date().optional(),dateTime:z.string().datetime({offset:true}).optional()}),
});

export async function readGoogleCalendar(token:string,from:string,through:string){
 const start=new Date(from+'T00:00:00');
 const end=new Date(through+'T00:00:00');
 if(!z.string().date().safeParse(from).success||!z.string().date().safeParse(through).success||from>through||
    Date.parse(through)-Date.parse(from)>=90*86400000)throw new Error('Choose a date range of up to 90 days.');
 end.setDate(end.getDate()+1);
 const query=new URLSearchParams({
  timeMin:start.toISOString(),timeMax:end.toISOString(),singleEvents:'true',orderBy:'startTime',
  maxResults:'250',fields:'nextPageToken,items(id,iCalUID,summary,status,start(date,dateTime))',
 });
 const events:CalendarImportEvent[]=[];
 for(let page=0;page<2;page++){
  const response=await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?'+query,{
   headers:{Authorization:'Bearer '+token},redirect:'error',cache:'no-store',
  });
  if(response.status===401||response.status===403)throw new Error('Google Calendar access expired or was denied. Authorize access again.');
  if(!response.ok)throw new Error('Google Calendar could not load events. Try again.');
  const result=await response.json();
  for(const item of Array.isArray(result.items)?result.items:[]){
   const parsed=eventSchema.safeParse(item);
   if(!parsed.success)continue;
   const event=parsed.data;
   if(event.status==='cancelled'||(!event.start.date&&!event.start.dateTime))continue;
   const date=event.start.date??event.start.dateTime!.slice(0,10);
   // Google returns events overlapping the window. Import only those that start in it.
   if(date<from||date>through)continue;
   const key=event.iCalUID?event.iCalUID+'|'+event.id:event.id;
   if(key.length>1024)continue;
   events.push({id:key,title:event.summary?.trim().slice(0,200)||'Untitled event',date,time:event.start.dateTime??null});
  }
  if(typeof result.nextPageToken!=='string'||!result.nextPageToken)return events;
  query.set('pageToken',result.nextPageToken);
 }
 throw new Error('There are too many events in this range. Choose a shorter range.');
}
