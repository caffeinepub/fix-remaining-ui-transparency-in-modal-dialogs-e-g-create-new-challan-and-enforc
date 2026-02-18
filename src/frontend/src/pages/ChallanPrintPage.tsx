import { useParams } from '@tanstack/react-router';
import { useChallans } from '../hooks/useQueries';
import { formatChallanRentDate, nanoToDate, formatDate, addDays } from '../utils/dates';
import { calculateChallanTotal, calculateItemTotal } from '../utils/challanTotals';
import { useEffect } from 'react';

export default function ChallanPrintPage() {
  const { challanId } = useParams({ from: '/challans/$challanId/print' });
  const { data: challans, isLoading } = useChallans();

  const challan = challans?.find((c) => c.id === challanId);

  useEffect(() => {
    if (challan && !isLoading) {
      // Auto-print after a short delay to ensure rendering is complete
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [challan, isLoading]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Loading challan...</p>
      </div>
    );
  }

  if (!challan) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Challan not found</p>
      </div>
    );
  }

  const total = calculateChallanTotal(challan);
  const rentDate = nanoToDate(challan.rentDate);
  const returnDate = addDays(rentDate, challan.numberOfDays);
  const creationDate = nanoToDate(challan.creationDate);

  return (
    <div className="print-challan-wrapper min-h-screen bg-white p-8">
      <div className="print-challan-content max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 border-b-2 border-gray-800 pb-4">
          <h1 className="text-3xl font-bold text-gray-900 mb-1">RENTIQ</h1>
          <p className="text-sm text-gray-700 mb-1">Udaipur's Events Equipment Rental Services</p>
          <p className="text-xs text-gray-600">
            Address: opposite bhairavnath palace, Sukher, Udaipur, Rajasthan 313001
          </p>
        </div>

        {/* Challan Info */}
        <div className="mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Challan: {challan.id}</h2>
              <p className="text-sm text-gray-600 mt-1">
                Status: <span className="font-semibold">{challan.returned ? 'Returned' : 'Active'}</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">
                Challan Creation Date: <span className="font-semibold">{formatDate(creationDate)}</span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-sm text-gray-600">Client Name</p>
              <p className="text-lg font-semibold">{challan.clientName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Venue</p>
              <p className="text-lg font-semibold">{challan.venue}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Rent Date</p>
              <p className="text-lg font-semibold">{formatChallanRentDate(challan.rentDate)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Return Date</p>
              <p className="text-lg font-semibold">{formatDate(returnDate)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Number of Days</p>
              <p className="text-lg font-semibold">{challan.numberOfDays}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Site</p>
              <p className="text-lg font-semibold">{challan.site || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Items</h3>
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-4 py-2 text-left">Item Name</th>
                <th className="border border-gray-300 px-4 py-2 text-right">Quantity</th>
                <th className="border border-gray-300 px-4 py-2 text-right">Rate</th>
                <th className="border border-gray-300 px-4 py-2 text-right">Days</th>
                <th className="border border-gray-300 px-4 py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {challan.items.map((item, index) => (
                <tr key={index}>
                  <td className="border border-gray-300 px-4 py-2">{item.itemName}</td>
                  <td className="border border-gray-300 px-4 py-2 text-right">{item.quantity}</td>
                  <td className="border border-gray-300 px-4 py-2 text-right">₹{item.rate.toFixed(2)}</td>
                  <td className="border border-gray-300 px-4 py-2 text-right">{item.rentalDays}</td>
                  <td className="border border-gray-300 px-4 py-2 text-right">
                    ₹{calculateItemTotal(item).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end mb-8">
          <div className="w-64 space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-700">Subtotal:</span>
              <span className="font-semibold">
                ₹{challan.items.reduce((sum, item) => sum + calculateItemTotal(item), 0).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Freight:</span>
              <span className="font-semibold">₹{challan.freight.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t-2 border-gray-800 pt-2">
              <span className="text-lg font-bold">Total:</span>
              <span className="text-lg font-bold">₹{total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Signatures */}
        <div className="grid grid-cols-2 gap-8 mt-12 pt-8 border-t border-gray-300">
          <div>
            <p className="text-sm text-gray-600 mb-8">Authorized Signature</p>
            <div className="border-t border-gray-400 pt-2">
              <p className="text-xs text-gray-500">Company Representative</p>
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-8">Client Signature</p>
            <div className="border-t border-gray-400 pt-2">
              <p className="text-xs text-gray-500">Client Representative</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
