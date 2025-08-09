
<<<<<<< Updated upstream
=======

>>>>>>> Stashed changes
import React from 'react';
import { useAppContext } from '../context/AppContext';
import Spinner from './Spinner';
import type { RecommendedBook } from '../types';
import { ShoppingCart, BookOpenCheck } from 'lucide-react';

const BookCard: React.FC<{ book: RecommendedBook }> = ({ book }) => {
    return (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden flex flex-col transform hover:-translate-y-1 transition-transform duration-300 border border-slate-100">
            <img src={book.imageUrl} alt={book.title} className="w-full h-56 object-cover" />
            <div className="p-6 flex flex-col flex-grow">
                <h3 className="text-xl font-bold text-slate-800 mb-2">{book.title}</h3>
                <p className="text-slate-600 text-sm mb-4 flex-grow">{book.description}</p>
                <div className="mt-auto pt-4 border-t border-slate-200 space-y-2">
                    <p className="text-xs text-slate-500 font-semibold mb-2">Purchase on Amazon:</p>
                     <div className="flex flex-col sm:flex-row sm:space-x-2 space-y-2 sm:space-y-0">
                         <a 
                            href={book.affiliateLinks.com}
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex-1 text-center bg-yellow-400 hover:bg-yellow-500 text-slate-800 font-bold py-2 px-3 rounded-lg text-sm flex items-center justify-center gap-2"
                        >
                            <ShoppingCart size={16} /> .com
                        </a>
                         <a 
                            href={book.affiliateLinks.in}
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex-1 text-center bg-yellow-400 hover:bg-yellow-500 text-slate-800 font-bold py-2 px-3 rounded-lg text-sm flex items-center justify-center gap-2"
                        >
                            <ShoppingCart size={16} /> .in
                        </a>
                         <a 
                            href={book.affiliateLinks.ae}
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex-1 text-center bg-yellow-400 hover:bg-yellow-500 text-slate-800 font-bold py-2 px-3 rounded-lg text-sm flex items-center justify-center gap-2"
                        >
                            <ShoppingCart size={16} /> .ae
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

const BookStore: React.FC = () => {
    const { suggestedBooks, isInitializing } = useAppContext();

    if (isInitializing) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <Spinner />
                <p className="mt-4 text-slate-500">Loading Books...</p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
                 <BookOpenCheck className="mx-auto h-12 w-12 text-cyan-500" />
                 <h1 className="text-4xl font-extrabold text-slate-900 mt-4">Recommended Study Materials</h1>
                <p className="mt-4 text-lg text-slate-600 max-w-3xl mx-auto">
                    Enhance your learning with our curated list of essential books for medical coding professionals. Each book has been selected to help you succeed in your exams and career.
                </p>
                <p className="text-xs text-slate-400 mt-4">
                    As an Amazon Associate, we earn from qualifying purchases. This does not add any extra cost for you.
                </p>
            </div>

            {suggestedBooks.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {suggestedBooks.map(book => (
                        <BookCard key={book.id} book={book} />
                    ))}
                </div>
            ) : (
                <p className="text-center text-slate-500">No books are currently recommended.</p>
            )}
        </div>
    );
};

export default BookStore;
