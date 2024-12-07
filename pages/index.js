import Link from 'next/link';

const Home = () => {
    return (
        <div>
            <h1>Home Page</h1>
            <Link href="/test">Go to Test Page</Link>
            <br />
            <Link href="/websites">Go to Websites Page</Link>
        </div>
    );
};

export default Home;
