import MultiSelectDropdown from '@/components/MultiSelectDropdown';
import MultiSelectChannelDropdown from '@/components/MultiSelectChannelDropdown';

const Test = () => {
  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold">Test Page</h1>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-2">Select Users</h2>
          <MultiSelectDropdown />
        </div>
        <div>
          <h2 className="text-xl font-semibold mb-2">Select Channels</h2>
          <MultiSelectChannelDropdown />
        </div>
      </div>
    </div>
  );
};

export default Test;
