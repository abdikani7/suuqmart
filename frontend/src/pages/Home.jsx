import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import ProductCard from '../components/ProductCard'
import { EmptyState, ProductGridSkeleton } from '../components/ui'

const categoryArt = {
  laptops: '/products/laptop-aero.svg',
  phones: '/products/phone-nova.svg',
  accessories: '/products/mouse.svg',
  components: '/products/ssd.svg',
  gadgets: '/products/watch.svg',
}

const perks = [
  ['Cash on delivery', 'Pay the courier when your order arrives.'],
  ['Mobile money', 'Pay from your phone at checkout.'],
  ['Delivered to your door', 'Enter your address and we bring it to you.'],
  ['Live stock counts', 'See what is in stock before you order.'],
]

function HeroArt() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-lg" aria-hidden="true">
      <div className="absolute inset-[8%] rounded-full bg-volt-500/30 blur-3xl" />
      <img src="/hero/laptop-aero.svg" alt="" className="absolute -left-[6%] top-[6%] w-[92%]" />
      <img src="/hero/phone-nova.svg" alt="" className="absolute -right-[14%] -top-[8%] w-[62%]" />
      <img src="/hero/watch.svg" alt="" className="absolute -bottom-[18%] left-[2%] w-[44%]" />
      <img src="/hero/buds.svg" alt="" className="absolute -bottom-[12%] right-[4%] w-[44%]" />
    </div>
  )
}

export default function Home() {
  const [products, setProducts] = useState(null)
  const [categories, setCategories] = useState([])

  useEffect(() => {
    supabase.from('products').select('*').eq('is_active', true).gt('stock', 0).order('created_at', { ascending: false }).limit(8)
      .then(({ data }) => setProducts(data || []))
    supabase.from('categories').select('*').order('name').then(({ data }) => setCategories(data || []))
  }, [])

  return (
    <div className="space-y-14">
      <section className="relative overflow-hidden rounded-3xl bg-navy-900 text-white">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-volt-500/20 blur-3xl" aria-hidden="true" />
        <div className="relative grid items-center gap-10 p-8 md:grid-cols-[1.05fr_1fr] md:p-14">
          <div>
            <h1 className="text-4xl font-extrabold leading-[1.1] md:text-6xl">
              Your next upgrade, <span className="text-volt-400">delivered.</span>
            </h1>
            <p className="mt-5 max-w-md text-lg text-slate-300">
              Laptops, phones, accessories, components and gadgets at honest prices. Pay on delivery or with mobile money.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/products" className="btn btn-primary !px-6 !py-3 text-base">Shop all products</Link>
              {categories.find((c) => c.slug === 'laptops') && (
                <Link to="/products?category=laptops" className="btn bg-white/10 !px-6 !py-3 text-base text-white hover:bg-white/20">Browse laptops</Link>
              )}
            </div>
          </div>
          <HeroArt />
        </div>
      </section>

      <section aria-label="Why shop with us" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {perks.map(([title, text]) => (
          <div key={title} className="card border-l-4 border-l-volt-500 p-4">
            <h2 className="font-display text-base font-bold">{title}</h2>
            <p className="mt-1 text-sm text-slate-500">{text}</p>
          </div>
        ))}
      </section>

      <section aria-labelledby="cats">
        <h2 id="cats" className="mb-4 text-2xl font-bold">Shop by category</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          {categories.map((c) => (
            <Link key={c.id} to={`/products?category=${c.slug}`}
              className="card group overflow-hidden transition hover:-translate-y-0.5 hover:ring-2 hover:ring-volt-500">
              <div className="aspect-[4/3] overflow-hidden bg-navy-800">
                {categoryArt[c.slug]
                  ? <img src={categoryArt[c.slug]} alt="" loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                  : <div className="flex h-full items-center justify-center font-display text-4xl font-bold text-volt-400">{c.name[0]}</div>}
              </div>
              <p className="px-4 py-3 font-display font-bold">{c.name}</p>
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="featured">
        <div className="mb-4 flex items-end justify-between">
          <h2 id="featured" className="text-2xl font-bold">Featured products</h2>
          <Link to="/products" className="text-sm font-semibold text-volt-600 hover:underline">See all</Link>
        </div>
        {products === null ? <ProductGridSkeleton count={4} />
          : products.length === 0 ? <EmptyState title="No products yet" text="Products added in the admin dashboard will appear here." />
          : <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">{products.slice(0, 4).map((p) => <ProductCard key={p.id} product={p} />)}</div>}
      </section>

      {categories.slice(0, 3).map((c) => <CategoryRow key={c.id} category={c} />)}
    </div>
  )
}

function CategoryRow({ category }) {
  const [items, setItems] = useState(null)
  useEffect(() => {
    supabase.from('products').select('*').eq('is_active', true).eq('category_id', category.id).order('created_at', { ascending: false }).limit(4)
      .then(({ data }) => setItems(data || []))
  }, [category.id])
  if (items && items.length === 0) return null
  return (
    <section aria-label={category.name}>
      <div className="mb-4 flex items-end justify-between">
        <h2 className="text-2xl font-bold">{category.name}</h2>
        <Link to={`/products?category=${category.slug}`} className="text-sm font-semibold text-volt-600 hover:underline">View all</Link>
      </div>
      {items === null ? <ProductGridSkeleton count={4} />
        : <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">{items.map((p) => <ProductCard key={p.id} product={p} />)}</div>}
    </section>
  )
}
