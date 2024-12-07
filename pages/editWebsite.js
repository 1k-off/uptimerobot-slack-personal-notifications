import MultiSelectDropdown from '@/components/MultiSelectDropdown';

const EditWebsite = () => {
  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold">Edit Website</h1>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-2">Select Users</h2>
          <MultiSelectDropdown
            apiEndpoint="/api/slackUsers"
            placeholder="Select users..."
            selectedPlaceholder="user(s)"
            labelKey="name"
            idKey="id"
          />
        </div>
        <div>
          <h2 className="text-xl font-semibold mb-2">Select Channels</h2>
          <MultiSelectDropdown
            apiEndpoint="/api/slackChannels"
            placeholder="Select channels..."
            selectedPlaceholder="channel(s)"
            labelKey="name"
            idKey="id"
          />
        </div>
      </div>
    </div>
  );
};

export default EditWebsite;
