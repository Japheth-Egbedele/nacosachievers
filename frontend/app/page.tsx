import React from 'react';
import NavBar from './components/NavBar';
import Footer from './components/Footer';
import HeroSection from './components/Home/HeroSection';
import AboutTeaser from './components/Home/AboutTeaser';
import UpcomingEventsPreview from './components/Home/UpcomingEventsPreview';
import LatestBlogNewsPreview from './components/Home/LatestBlogNewsPreview';
import GalleryTeaser from './components/Home/GalleryTeaser';
import HubTeaser from './components/Home/HubTeaser';
import CyberspaceCommunityTeaser from './components/Home/CyberspaceCommunityTeaser';
import WhatsAppCommunityJoin from './components/Home/WhatsAppCommunityJoin';
import ActiveAnnouncementBanner from './components/Home/ActiveAnnouncementBanner';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <ActiveAnnouncementBanner />
      <NavBar />
      <main className="flex-1">
        <HeroSection />
        <AboutTeaser />
        <UpcomingEventsPreview />
        <LatestBlogNewsPreview />
        <GalleryTeaser />
        <HubTeaser />
        <CyberspaceCommunityTeaser />
        <WhatsAppCommunityJoin />
      </main>
      <Footer />
    </div>
  );
}
