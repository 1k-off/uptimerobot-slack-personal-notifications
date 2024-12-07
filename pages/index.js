import Link from 'next/link';

const Home = () => {
    return (
        <div>
            <h1>Home Page</h1>
            <Link href="/websites">Go to Websites Page</Link>
            <br />
            <Link href="/editWebsite">Go to Edit Website Page</Link>
        </div>
    );
};

export default Home;
