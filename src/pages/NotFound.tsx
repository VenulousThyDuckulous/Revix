import { ActionButton, Card } from '../components/ui';

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center bg-white px-4">
      <Card className="max-w-md text-center">
        <div className="text-5xl">🧭</div>
        <h1 className="mt-3 text-2xl font-black">Lost the match</h1>
        <p className="mt-1 text-sm font-bold text-duo-muted">
          That page doesn't exist. Head back to the pitch.
        </p>
        <div className="mt-5 flex justify-center gap-2">
          <ActionButton to="/dashboard">Back to Revix</ActionButton>
          <ActionButton variant="ghost" to="/">
            Home
          </ActionButton>
        </div>
      </Card>
    </div>
  );
}
