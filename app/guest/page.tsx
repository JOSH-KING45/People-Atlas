import PeopleWorkspace from '../people-workspace';
export const dynamic='force-dynamic';
export default function Guest(){return <PeopleWorkspace signInHref={'/login'} guest/>}
