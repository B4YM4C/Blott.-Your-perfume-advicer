import EditPerfumePage from '../[id]/page';

export const dynamic = 'force-dynamic';

export default function NewPerfumePage() {
  return EditPerfumePage({ params: { id: 'new' } });
}
