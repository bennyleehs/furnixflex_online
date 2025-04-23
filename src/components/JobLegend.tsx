interface JobLegendProps {
    expiredCount: number;
    nearExpiryCount: number;
    activeCount: number;
  }
  
  const JobLegend = ({
    expiredCount,
    nearExpiryCount,
    activeCount,
  }: JobLegendProps) => {
    const legends = [
      {
        label: `Expired (${expiredCount})`,
        colorClass: "bg-[#FA6451] text-white", // Expired jobs
      },
      {
        label: `Near Expiry (${nearExpiryCount})`,
        colorClass: "bg-[#FCC55A] text-black", // Jobs near expiry
      },
      {
        label: `Active (${activeCount})`,
        colorClass: "bg-green-500 text-black", // Active jobs
      },
    ];
  
    return (
      <div className="flex space-x-30">
        {legends.map((legend, index) => (
          <div key={index} className="flex items-center">
            <div className={`w-6 h-6 rounded-full ${legend.colorClass}`} />
            <span className="ml-2">{legend.label}</span>
          </div>
        ))}
      </div>
    );
  };
  
  export default JobLegend;
  