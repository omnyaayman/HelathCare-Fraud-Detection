
    
    

with all_values as (

    select
        is_fraud as value_field,
        count(*) as n_records

    from "dashboard"."main"."stg_claims"
    group by is_fraud

)

select *
from all_values
where value_field not in (
    'True','False'
)


