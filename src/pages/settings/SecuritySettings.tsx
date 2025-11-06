import TOTPManagement from '../../components/auth/TOTPManagement';

export default function SecuritySettings() {
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Security</h1>
      <TOTPManagement />
    </div>
  );
}
