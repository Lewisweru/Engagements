import React from 'react';
import { Instagram, Twitter } from 'lucide-react';

interface AccountCardProps {
  account: {
    id: number;
    type: string;
    age: string;
    followers: string;
    price: number;
    image: string;
  };
}

const AccountCard: React.FC<AccountCardProps> = ({ account }) => {
  return (
    <div className="bg-gray-800 rounded-xl overflow-hidden shadow-lg transform transition-all duration-300 hover:scale-105">
      <div className="relative h-48">
        <img
          src={account.image}
          alt={`${account.type} account`}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-4 left-4">
          {account.type === 'instagram' ? (
            <div className="bg-purple-600 p-2 rounded-lg">
              <Instagram className="h-6 w-6 text-white" />
            </div>
          ) : (
            <div className="bg-blue-600 p-2 rounded-lg">
              <Twitter className="h-6 w-6 text-white" />
            </div>
          )}
        </div>
      </div>
      
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-semibold text-white capitalize">
              {account.type} Account
            </h3>
            <p className="text-gray-400 mt-1">{account.followers} Followers</p>
          </div>
          <span className="bg-green-600 text-white px-3 py-1 rounded-full text-sm">
            ${account.price}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-gray-400 text-sm">Age: {account.age}</span>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors duration-200">
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccountCard;